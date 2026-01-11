import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { logActivityDirect } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

export interface Service {
  id: string;
  seller_tenant_id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  long_description: string | null;
  images: string[];
  benefits: string[];
  billing_type: 'recurring' | 'one_time';
  interval: 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | null;
  price: number;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  recurrence_enabled: boolean;
  recurrence_value: number;
  duration_months: number;
  cta_text: string;
  display_order: number;
  is_featured: boolean;
  active: boolean;
  created_at: string;
  // Variation fields
  parent_service_id: string | null;
  is_variation: boolean;
  variation_label: string | null;
}

export type ServiceInsert = Omit<Service, 'id' | 'created_at' | 'seller_tenant_id'>;
export type ServiceUpdate = Partial<ServiceInsert>;

export const useServices = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['services', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(s => ({
        ...s,
        images: s.images || [],
        benefits: s.benefits || [],
        commission_type: s.commission_type || 'percentage',
        commission_value: s.commission_value || 0,
        recurrence_enabled: s.recurrence_enabled || false,
        recurrence_value: s.recurrence_value || 0,
        duration_months: s.duration_months || 1,
        cta_text: s.cta_text || 'Assinar',
        display_order: s.display_order || 0,
        is_featured: s.is_featured || false,
        parent_service_id: s.parent_service_id || null,
        is_variation: s.is_variation || false,
        variation_label: s.variation_label || null,
      })) as Service[];
    },
    enabled: !!currentTenant,
  });

  const createService = useMutation({
    mutationFn: async (service: ServiceInsert) => {
      const { data, error } = await supabase
        .from('services')
        .insert({
          ...service,
          seller_tenant_id: currentTenant!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newService) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço criado com sucesso');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'create', 'service', {
          service_id: newService.id,
          service_name: newService.name,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar serviço: ' + error.message);
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...updates }: ServiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedService) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço atualizado com sucesso');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'update', 'service', {
          service_id: updatedService.id,
          service_name: updatedService.name,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar serviço: ' + error.message);
    },
  });

  const toggleServiceStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('services')
        .update({ active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(variables.active ? 'Serviço ativado' : 'Serviço desativado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço excluído com sucesso');
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'delete', 'service', {
          service_id: deletedId,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir serviço: ' + error.message);
    },
  });

  const canManageServices = true;

  return {
    services,
    isLoading,
    error,
    createService,
    updateService,
    toggleServiceStatus,
    deleteService,
    canManageServices,
  };
};