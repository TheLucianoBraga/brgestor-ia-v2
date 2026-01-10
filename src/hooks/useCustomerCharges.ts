import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface CustomerCharge {
  id: string;
  tenant_id: string;
  customer_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerChargeInsert {
  customer_id: string;
  description: string;
  amount: number;
  due_date: string;
}

export interface CustomerChargeFormData {
  amount: number;
  due_date: string;
  description: string;
}

export const useCustomerCharges = (customerId?: string) => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Realtime subscription for instant sync
  useEffect(() => {
    if (!currentTenant?.id) return;

    const channel = supabase
      .channel('customer-charges-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_charges',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        (payload) => {
          console.log('🔄 Customer charges realtime update:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['customer-charges', currentTenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, queryClient]);

  const chargesQuery = useQuery({
    queryKey: ['customer-charges', currentTenant?.id, customerId],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      let query = supabase
        .from('customer_charges')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('due_date', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CustomerCharge[];
    },
    enabled: !!currentTenant?.id,
  });

  const createCharge = useMutation({
    mutationFn: async (data: CustomerChargeInsert) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const { data: newCharge, error } = await supabase
        .from('customer_charges')
        .insert({
          description: data.description,
          amount: Number(data.amount),
          due_date: data.due_date,
          customer_id: data.customer_id,
          tenant_id: currentTenant.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return newCharge as CustomerCharge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar cobrança');
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_charges')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança marcada como paga!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao marcar como pago');
    },
  });

  const cancelCharge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_charges')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança cancelada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cancelar cobrança');
    },
  });

  const deleteCharge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_charges')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir cobrança');
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
  };

  return {
    charges: chargesQuery.data || [],
    isLoading: chargesQuery.isLoading,
    createCharge,
    markAsPaid,
    cancelCharge,
    deleteCharge,
    refetch,
  };
};
