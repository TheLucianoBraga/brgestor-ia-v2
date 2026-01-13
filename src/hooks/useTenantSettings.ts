import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { logActivityDirect } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

interface TenantSetting {
  id: string;
  tenant_id: string;
  key: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export const useTenantSettings = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant_settings', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return {};
      
      try {
        const { data, error } = await supabase
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', currentTenant.id);

        // Return empty object on any error - don't break the app
        if (error) {
          console.warn('tenant_settings query error:', error.message);
          return {};
        }

        // Convert to key-value object
        const settingsMap: Record<string, string> = {};
        (data as TenantSetting[] | null)?.forEach((setting) => {
          if (setting.value) {
            settingsMap[setting.key] = setting.value;
          }
        });
        return settingsMap;
      } catch (err) {
        console.warn('tenant_settings fetch failed:', err);
        return {};
      }
    },
    enabled: !!currentTenant?.id,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const { error } = await supabase
        .from('tenant_settings')
        .upsert(
          { tenant_id: currentTenant.id, key, value },
          { onConflict: 'tenant_id,key' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_settings', currentTenant?.id] });
    },
    onError: (error) => {
      console.error('Error updating setting:', error);
      toast.error('Erro ao salvar configuração');
    },
  });

  const updateMultipleSettings = useMutation({
    mutationFn: async (settingsToUpdate: Record<string, string>) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const upsertData = Object.entries(settingsToUpdate).map(([key, value]) => ({
        tenant_id: currentTenant.id,
        key,
        value,
      }));

      const { error } = await supabase
        .from('tenant_settings')
        .upsert(upsertData, { onConflict: 'tenant_id,key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_settings', currentTenant?.id] });
      // Removed toast - callers should show their own toast if needed
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  // Version that shows toast - for manual saves
  const updateMultipleSettingsWithToast = useMutation({
    mutationFn: async (settingsToUpdate: Record<string, string>) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const upsertData = Object.entries(settingsToUpdate).map(([key, value]) => ({
        tenant_id: currentTenant.id,
        key,
        value,
      }));

      const { error } = await supabase
        .from('tenant_settings')
        .upsert(upsertData, { onConflict: 'tenant_id,key' });

      if (error) throw error;
    },
    onSuccess: (_, updatedSettings) => {
      queryClient.invalidateQueries({ queryKey: ['tenant_settings', currentTenant?.id] });
      toast.success('Configurações salvas com sucesso');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'config_change', 'config', {
          changed_keys: Object.keys(updatedSettings),
        });
      }
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  const getSetting = (key: string): string => {
    return settings?.[key] || '';
  };

  return {
    settings,
    isLoading,
    getSetting,
    updateSetting,
    updateMultipleSettings,
    updateMultipleSettingsWithToast,
  };
};

