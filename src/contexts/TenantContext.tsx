import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      // Query for active members only - pending members should not have access to dashboard
      const { data, error } = await supabase
        .from('tenant_members')
        .select(`
          tenant_id,
          role_in_tenant,
          status,
          tenants!inner (
            id,
            name,
            type,
            status,
            trial_ends_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Filter only active members for tenant access
      const activeTenants: Tenant[] = (data || [])
        .filter((item: any) => item.status === 'active')
        .map((item: any) => ({
          id: item.tenant_id,
          name: item.tenants.name,
          type: item.tenants.type,
          status: item.tenants.status,
          role_in_tenant: item.role_in_tenant,
          trial_ends_at: item.tenants.trial_ends_at,
        }));

      // Check if user has any pending memberships (for better UX messaging)
      const hasPendingMembership = (data || []).some((item: any) => item.status === 'pending');

      setUserTenants(activeTenants);

      // Set current tenant based on profile
      if (profile?.current_tenant_id) {
        const current = activeTenants.find(t => t.id === profile.current_tenant_id);
        setCurrentTenant(current || null);
      } else {
        setCurrentTenant(null);
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
      const { data, error } = await supabase.rpc('set_current_tenant', {
        _tenant_id: tenantId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

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
