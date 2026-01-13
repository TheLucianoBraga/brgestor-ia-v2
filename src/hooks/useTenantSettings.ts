import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
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

export function useTenantSettings() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant_settings', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return {};
      
      try {
        const { data, error } = await api.getTenantSettings();

        // Return empty object on any error - don't break the app
        if (error) {
          console.warn('tenant_settings query error:', error);
          return {};
        }

        // Convert to key-value object
        const settingsMap: Record<string, string> = {};
        
        if (Array.isArray(data)) {
          data.forEach((setting: TenantSetting) => {
            settingsMap[setting.key] = setting.value || '';
          });
        }

        return settingsMap;
      } catch (err) {
        console.warn('tenant_settings fetch failed:', err);
        return {};
      }
    },
    enabled: !!currentTenant?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const { error } = await api.saveTenantSetting(key, value);

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
        key,
        value,
      }));

      const { error } = await api.saveTenantSettingsBatch(upsertData);

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

  const saveBatchSettings = useMutation({
    mutationFn: async (settingsToUpdate: Record<string, string>) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const upsertData = Object.entries(settingsToUpdate).map(([key, value]) => ({
        key,
        value,
      }));

      const { error } = await api.saveTenantSettingsBatch(upsertData);

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
      console.error('Error saving batch settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  return {
    settings: settings || {},
    isLoading,
    updateSetting: updateSetting.mutate,
    updateMultipleSettings: updateMultipleSettings.mutate,
    saveBatchSettings: saveBatchSettings.mutate,
    isUpdating: updateSetting.isPending || updateMultipleSettings.isPending || saveBatchSettings.isPending,
  };
}

// Helper function to get a specific setting
export function useTenantSetting(key: string, defaultValue: string = '') {
  const { settings } = useTenantSettings();
  return settings[key] ?? defaultValue;
}

// Helper function to check if a setting exists and has a truthy value
export function useTenantSettingEnabled(key: string) {
  const { settings } = useTenantSettings();
  const value = settings[key];
  return value === 'true' || value === '1' || value === 'enabled';
}

