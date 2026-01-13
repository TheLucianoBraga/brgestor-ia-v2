import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';

export interface PendingCustomer {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  created_at: string;
  customer_tenant_id: string | null;
}

export function usePendingCustomers() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Realtime subscription for instant sync
  useEffect(() => {
    if (!currentTenant?.id) return;

    const channel = supabase
      .channel('pending-customers_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        (payload) => {
          console.log('🔄 Pending customers realtime update:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['pending_customers', currentTenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, queryClient]);

  const { data: pendingCustomers = [], isLoading, refetch } = useQuery({
    queryKey: ['pending_customers', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, email, whatsapp, created_at, customer_tenant_id')
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as PendingCustomer[];
    },
    enabled: !!currentTenant?.id,
  });

  return {
    pendingCustomers,
    pendingCount: pendingCustomers.length,
    isLoading,
    refetch,
  };
}

