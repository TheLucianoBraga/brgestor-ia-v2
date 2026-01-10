import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';

interface CustomerAuthData {
  customerId: string;
  customerName: string;
  tenantId: string;
  email: string;
}

interface PreviewModeData {
  isPreview: true;
  tenantId: string;
  tenantName: string;
  userEmail: string;
}

interface CustomerAuthContextType {
  customer: CustomerAuthData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasActiveService: boolean;
  isPreviewMode: boolean;
  previewData: PreviewModeData | null;
  login: (email: string, passwordHash: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  enterPreviewMode: (tenantId: string, tenantName: string, userEmail: string) => void;
  exitPreviewMode: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'customer_auth';
const PREVIEW_KEY = 'portal_preview_mode';

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerAuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveService, setHasActiveService] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewModeData | null>(null);

  const isPreviewMode = !!previewData;

  const checkActiveService = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase.rpc('customer_has_active_service', {
        _customer_id: customerId
      });
      if (!error) {
        setHasActiveService(data || false);
      }
    } catch (err) {
      console.error('Error checking active service:', err);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      // Check for preview mode first
      const previewStored = sessionStorage.getItem(PREVIEW_KEY);
      if (previewStored) {
        try {
          const data = JSON.parse(previewStored) as PreviewModeData;
          setPreviewData(data);
          setIsLoading(false);
          return;
        } catch {
          sessionStorage.removeItem(PREVIEW_KEY);
        }
      }

      // Check for regular customer auth
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored) as CustomerAuthData;
          setCustomer(data);
          await checkActiveService(data.customerId);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [checkActiveService]);

  const login = async (email: string, passwordHash: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('authenticate_customer', {
        _email: email,
        _password_hash: passwordHash
      });

      if (error) {
        return { success: false, error: getFriendlyErrorMessage(error.message) };
      }

      const result = data as { success: boolean; error?: string; customer_id?: string; customer_name?: string; tenant_id?: string; email?: string };

      if (!result.success) {
        return { success: false, error: result.error || 'E-mail ou senha incorretos.' };
      }

      const customerData: CustomerAuthData = {
        customerId: result.customer_id!,
        customerName: result.customer_name!,
        tenantId: result.tenant_id!,
        email: result.email!
      };

      setCustomer(customerData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customerData));
      await checkActiveService(customerData.customerId);

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getFriendlyErrorMessage(err) };
    }
  };

  const logout = () => {
    setCustomer(null);
    setHasActiveService(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const enterPreviewMode = (tenantId: string, tenantName: string, userEmail: string) => {
    const preview: PreviewModeData = {
      isPreview: true,
      tenantId,
      tenantName,
      userEmail
    };
    setPreviewData(preview);
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(preview));
  };

  const exitPreviewMode = () => {
    setPreviewData(null);
    sessionStorage.removeItem(PREVIEW_KEY);
  };

  // In preview mode, we're authenticated with preview data
  const isAuthenticated = !!customer || isPreviewMode;

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isLoading,
        isAuthenticated,
        hasActiveService: isPreviewMode ? true : hasActiveService,
        isPreviewMode,
        previewData,
        login,
        logout,
        enterPreviewMode,
        exitPreviewMode
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return context;
};
