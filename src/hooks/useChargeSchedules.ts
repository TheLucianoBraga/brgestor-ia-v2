import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';

export interface ChargeSchedule {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_item_id: string | null;
  scheduled_for: string;
  type: 'before_due' | 'on_due' | 'after_due';
  days_offset: number;
  template_id: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ChargeScheduleWithCustomer extends ChargeSchedule {
  customers?: {
    full_name: string;
    whatsapp: string;
  };
  message_templates?: {
    name: string;
  } | null;
}

export interface CreateScheduleInput {
  customer_id: string;
  customer_item_id?: string;
  scheduled_for: string;
  type: 'before_due' | 'on_due' | 'after_due';
  days_offset: number;
  template_id?: string | null;
}

export const useChargeSchedules = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  const schedulesQuery = useQuery({
    queryKey: ['charge_schedules', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charge_schedules')
        .select(`
          *,
          customers(full_name, whatsapp),
          message_templates(name)
        `)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as ChargeScheduleWithCustomer[];
    },
    enabled: !!currentTenant?.id,
  });

  const pendingSchedulesQuery = useQuery({
    queryKey: ['charge-schedules_pending', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charge_schedules')
        .select('customer_id, status')
        .in('status', ['pending', 'sent']);

      if (error) throw error;
      return data;
    },
    enabled: !!currentTenant?.id,
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: CreateScheduleInput) => {
      const { data, error } = await supabase
        .from('charge_schedules')
        .insert({
          ...schedule,
          tenant_id: currentTenant!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge_schedules'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar agendamento:', error);
    },
  });

  const createBulkSchedules = useMutation({
    mutationFn: async (schedules: CreateScheduleInput[]) => {
      const { data, error } = await supabase
        .from('charge_schedules')
        .insert(
          schedules.map((s) => ({
            ...s,
            tenant_id: currentTenant!.id,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge_schedules'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar agendamentos:', error);
    },
  });

  const cancelSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('charge_schedules')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge_schedules'] });
      toast.success('Agendamento cancelado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('charge_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge_schedules'] });
      toast.success('Agendamento excluído');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  const retrySchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('charge_schedules')
        .update({ 
          status: 'pending',
          error_message: null,
          scheduled_for: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge_schedules'] });
      toast.success('Cobrança reagendada para reenvio!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao reagendar: ' + error.message);
    },
  });

  const getCustomerScheduleStatus = (customerId: string) => {
    const customerSchedules = pendingSchedulesQuery.data?.filter(
      (s) => s.customer_id === customerId
    );
    
    if (!customerSchedules?.length) return null;
    
    const pending = customerSchedules.filter((s) => s.status === 'pending').length;
    const sent = customerSchedules.filter((s) => s.status === 'sent').length;
    
    return { pending, sent };
  };

  // Filtered lists
  const allSchedules = schedulesQuery.data || [];
  const pendingChargeSchedules = allSchedules.filter(s => s.status === 'pending');
  const sentChargeSchedules = allSchedules.filter(s => s.status === 'sent');
  const failedChargeSchedules = allSchedules.filter(s => s.status === 'failed');
  const cancelledChargeSchedules = allSchedules.filter(s => s.status === 'cancelled');

  return {
    schedules: allSchedules,
    isLoading: schedulesQuery.isLoading,
    pendingSchedules: pendingSchedulesQuery.data || [],
    pendingChargeSchedules,
    sentChargeSchedules,
    failedChargeSchedules,
    cancelledChargeSchedules,
    createSchedule,
    createBulkSchedules,
    cancelSchedule,
    deleteSchedule,
    retrySchedule,
    getCustomerScheduleStatus,
  };
};

