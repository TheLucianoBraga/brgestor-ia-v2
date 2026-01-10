import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NotificationPreferences {
  id?: string;
  tenant_id: string;
  user_id: string | null;
  in_app_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  payment_notifications: boolean;
  customer_notifications: boolean;
  reseller_notifications: boolean;
  charge_notifications: boolean;
  system_notifications: boolean;
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'tenant_id' | 'user_id'> = {
  in_app_enabled: true,
  whatsapp_enabled: true,
  push_enabled: false,
  email_enabled: true,
  payment_notifications: true,
  customer_notifications: true,
  reseller_notifications: true,
  charge_notifications: true,
  system_notifications: true,
  daily_summary_enabled: true,
  daily_summary_time: '08:00:00',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '07:00:00',
};

export const useNotificationPreferences = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', currentTenant?.id, user?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        return data as NotificationPreferences;
      }

      return {
        ...defaultPreferences,
        tenant_id: currentTenant.id,
        user_id: user?.id || null,
      } as NotificationPreferences;
    },
    enabled: !!currentTenant?.id,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('notification_preferences')
          .update(updates)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            tenant_id: currentTenant.id,
            user_id: user?.id || null,
            ...defaultPreferences,
            ...updates,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Preferências salvas');
    },
    onError: (error) => {
      console.error('Error updating preferences:', error);
      toast.error('Erro ao salvar preferências');
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences,
  };
};
