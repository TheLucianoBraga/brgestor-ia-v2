import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string | null;
}

export type NotificationType = 
  | 'novo_cliente' 
  | 'pagamento_recebido' 
  | 'cliente_vencido' 
  | 'novo_usuario' 
  | 'sistema'
  | 'trial_warning';

export const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: 'novo_cliente', label: 'Novo Cliente' },
  { value: 'pagamento_recebido', label: 'Pagamento Recebido' },
  { value: 'cliente_vencido', label: 'Cliente Vencido' },
  { value: 'novo_usuario', label: 'Novo Usuário' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'trial_warning', label: 'Aviso de Trial' },
];

export const useNotifications = (limit?: number) => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', currentTenant?.id, limit],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!currentTenant?.id,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return 0;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentTenant?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!currentTenant?.id) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        (payload) => {
          console.log('Notification change:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            toast.info(newNotification.title, {
              description: newNotification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error('Tenant not selected');
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('tenant_id', currentTenant.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('Todas notificações marcadas como lidas');
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('Notificação excluída');
    },
  });

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
