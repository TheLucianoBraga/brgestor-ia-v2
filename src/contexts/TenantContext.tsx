import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { useAuth } from './AuthContext';

export interface Tenant {
  id: string;
  name: string;
  type: 'master' | 'adm' | 'revenda' | 'cliente';
  status: string;
  role_in_tenant: string;
  trial_ends_at?: string | null;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: Tenant[];
  isLoading: boolean;
  hasMultipleTenants: boolean;
  switchTenant: (tenantId: string) => Promise<{ success: boolean; error?: string }>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user, profile, refreshProfile, isAuthenticated } = useAuth();
  const [userTenants, setUserTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserTenants = useCallback(async () => {
    if (!user) {
      setUserTenants([]);
      setCurrentTenant(null);
      setIsLoading(false);
      return;
    }

    try {
      // Mock data - durante migração
      const mockTenants: Tenant[] = [
        {
          id: 'tenant-1',
          name: 'Tenant Principal',
          type: 'adm',
          status: 'active',
          role_in_tenant: 'admin',
          trial_ends_at: null,
        }
      ];

      setUserTenants(mockTenants);

      // Set current tenant based on profile
      if (profile?.current_tenant_id) {
        const current = mockTenants.find(t => t.id === profile.current_tenant_id);
        setCurrentTenant(current || mockTenants[0]);
      } else {
        setCurrentTenant(mockTenants[0]);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setUserTenants([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile?.current_tenant_id]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserTenants();
    } else {
      setUserTenants([]);
      setCurrentTenant(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user, fetchUserTenants]);

  const switchTenant = useCallback(async (tenantId: string) => {
    try {
      // Mock response - sempre sucesso
      const result = { success: true };

      if (result.success) {
        await refreshProfile();
        const newTenant = userTenants.find(t => t.id === tenantId);
        setCurrentTenant(newTenant || null);
      }

      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [refreshProfile, userTenants]);

  const refreshTenants = useCallback(async () => {
    await fetchUserTenants();
  }, [fetchUserTenants]);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        userTenants,
        isLoading,
        hasMultipleTenants: userTenants.length > 1,
        switchTenant,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

