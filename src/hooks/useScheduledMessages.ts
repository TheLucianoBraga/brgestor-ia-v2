import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';

export interface ScheduledMessage {
  id: string;
  tenant_id: string;
  template_id: string | null;
  customer_id: string | null;
  scheduled_at: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error_message: string | null;
  custom_content: string | null;
  created_at: string;
  // Joined data
  template?: {
    id: string;
    name: string;
    type: string;
  } | null;
  customer?: {
    id: string;
    full_name: string;
    whatsapp: string;
    email: string;
  } | null;
}

export interface ScheduledMessageInsert {
  template_id?: string | null;
  customer_id?: string | null;
  scheduled_at: string;
  custom_content?: string | null;
}

export const useScheduledMessages = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  const scheduledMessagesQuery = useQuery({
    queryKey: ['scheduled-messages', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select(`
          *,
          template:message_templates(id, name, type),
          customer:customers(id, full_name, whatsapp, email)
        `)
        .eq('tenant_id', currentTenant.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as ScheduledMessage[];
    },
    enabled: !!currentTenant?.id,
  });

  const createScheduledMessage = useMutation({
    mutationFn: async (message: ScheduledMessageInsert) => {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .insert({
          ...message,
          tenant_id: currentTenant!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] });
      toast.success('Mensagem agendada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao agendar mensagem: ' + error.message);
    },
  });

  const cancelScheduledMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] });
      toast.success('Agendamento cancelado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar agendamento: ' + error.message);
    },
  });

  const deleteScheduledMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] });
      toast.success('Mensagem excluída!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir mensagem: ' + error.message);
    },
  });

  const retryScheduledMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ 
          status: 'pending',
          error_message: null,
          scheduled_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] });
      toast.success('Mensagem reagendada para reenvio!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao reagendar mensagem: ' + error.message);
    },
  });

  const pendingMessages = scheduledMessagesQuery.data?.filter(m => m.status === 'pending') || [];
  const sentMessages = scheduledMessagesQuery.data?.filter(m => m.status === 'sent') || [];
  const failedMessages = scheduledMessagesQuery.data?.filter(m => m.status === 'failed') || [];

  return {
    scheduledMessages: scheduledMessagesQuery.data || [],
    pendingMessages,
    sentMessages,
    failedMessages,
    isLoading: scheduledMessagesQuery.isLoading,
    createScheduledMessage,
    cancelScheduledMessage,
    deleteScheduledMessage,
    retryScheduledMessage,
  };
};
