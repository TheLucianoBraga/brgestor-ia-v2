import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PortalCustomerInfo {
  customerId: string | undefined;
  customerName: string | undefined;
  tenantId: string | undefined;
  isLoading: boolean;
  authType: 'customer' | 'supabase' | 'preview' | null;
}

/**
 * Hook unificado para resolver o customerId no Portal.
 * Funciona para:
 * - CustomerAuth (login via customer_auth)
 * - Supabase Auth com tenant tipo 'cliente'
 * - Preview mode
 */
export function usePortalCustomerId(): PortalCustomerInfo {
  const { customer, isPreviewMode, previewData, isAuthenticated: isCustomerAuth } = useCustomerAuth();
  const { isAuthenticated: isSupabaseAuth, profile } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();

  // Check if user is authenticated via Supabase Auth with cliente tenant type
  const isClienteTenantUser = isSupabaseAuth && currentTenant?.type === 'cliente';

  // For Supabase Auth cliente users, we need to find their customer record
  const { data: supabaseCustomer, isLoading: customerLoading } = useQuery({
    queryKey: ['portal-customer-by-tenant', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      // Find customer where customer_tenant_id matches the current tenant
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, tenant_id')
        .eq('customer_tenant_id', currentTenant.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching customer by tenant:', error);
        return null;
      }
      
      return data;
    },
    enabled: isClienteTenantUser && !!currentTenant?.id,
  });

  // Preview mode - previewData has tenantId but not customerId
  if (isPreviewMode && previewData) {
    return {
      customerId: undefined, // Preview mode doesn't have real customerId
      customerName: previewData.tenantName,
      tenantId: previewData.tenantId,
      isLoading: false,
      authType: 'preview',
    };
  }

  // CustomerAuth (portal customers)
  if (isCustomerAuth && customer) {
    return {
      customerId: customer.customerId,
      customerName: customer.customerName,
      tenantId: customer.tenantId,
      isLoading: false,
      authType: 'customer',
    };
  }

  // Supabase Auth with cliente tenant
  if (isClienteTenantUser) {
    return {
      customerId: supabaseCustomer?.id,
      customerName: profile?.full_name || currentTenant?.name,
      tenantId: supabaseCustomer?.tenant_id || undefined,
      isLoading: tenantLoading || customerLoading,
      authType: 'supabase',
    };
  }

  return {
    customerId: undefined,
    customerName: undefined,
    tenantId: undefined,
    isLoading: tenantLoading,
    authType: null,
  };
}
