import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { logActivityDirect } from '@/hooks/useActivityLog';
import { toast } from 'sonner';
import { Customer } from './useCustomers';

export interface Charge {
  id: string;
  tenant_id: string;
  customer_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface ChargeInsert {
  customer_id: string;
  description: string;
  amount: number;
  due_date: string;
}

export const useCharges = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const chargesQuery = useQuery({
    queryKey: ['charges', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('customer_charges')
        .select('*, customer:customers(*)')
        .eq('tenant_id', currentTenant.id)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as Charge[];
    },
    enabled: !!currentTenant?.id,
  });

  const createCharge = useMutation({
    mutationFn: async (data: ChargeInsert) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const { data: newCharge, error } = await supabase
        .from('customer_charges')
        .insert({
          ...data,
          tenant_id: currentTenant.id,
        })
        .select()
        .single();

      if (error) throw error;
      return newCharge;
    },
    onSuccess: (newCharge) => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança criada com sucesso!');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'create', 'charge', {
          charge_id: newCharge.id,
          amount: newCharge.amount,
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar cobrança');
    },
  });

  const updateCharge = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ChargeInsert> & { id: string }) => {
      const { error } = await supabase
        .from('customer_charges')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar cobrança');
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
    onSuccess: (_, chargeId) => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança marcada como paga!');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'payment', 'charge', {
          charge_id: chargeId,
          action: 'mark_as_paid',
        });
      }
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
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança cancelada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cancelar cobrança');
    },
  });

  const deleteCharge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customer_charges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['customer-charges'] });
      toast.success('Cobrança excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir cobrança');
    },
  });

  // Calculate metrics
  const metrics = {
    total: chargesQuery.data?.length || 0,
    pending: chargesQuery.data?.filter(c => c.status === 'pending').length || 0,
    paid: chargesQuery.data?.filter(c => c.status === 'paid').length || 0,
    overdue: chargesQuery.data?.filter(c => c.status === 'overdue').length || 0,
    totalAmount: chargesQuery.data?.reduce((acc, c) => acc + Number(c.amount), 0) || 0,
    paidAmount: chargesQuery.data?.filter(c => c.status === 'paid').reduce((acc, c) => acc + Number(c.amount), 0) || 0,
  };

  return {
    charges: chargesQuery.data || [],
    isLoading: chargesQuery.isLoading,
    metrics,
    createCharge,
    updateCharge,
    markAsPaid,
    cancelCharge,
    deleteCharge,
  };
};
