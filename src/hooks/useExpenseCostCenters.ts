import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type ExpenseCostCenter = Database['public']['Tables']['expense_cost_centers']['Row'];
type ExpenseCostCenterInsert = Database['public']['Tables']['expense_cost_centers']['Insert'];
type ExpenseCostCenterUpdate = Database['public']['Tables']['expense_cost_centers']['Update'];

export const useExpenseCostCenters = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  // Fetch cost centers
  const costCentersQuery = useQuery({
    queryKey: ['expense-cost-centers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('expense_cost_centers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as ExpenseCostCenter[];
    },
    enabled: !!tenantId,
  });

  // Create cost center
  const createCostCenter = useMutation({
    mutationFn: async (data: Omit<ExpenseCostCenterInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('Tenant não selecionado');

      const { data: costCenter, error } = await supabase
        .from('expense_cost_centers')
        .insert({ ...data, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return costCenter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-cost-centers', tenantId] });
      toast.success('Centro de custo criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating cost center:', error);
      toast.error('Erro ao criar centro de custo');
    },
  });

  // Update cost center
  const updateCostCenter = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseCostCenterUpdate }) => {
      const { data: costCenter, error } = await supabase
        .from('expense_cost_centers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return costCenter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-cost-centers', tenantId] });
      toast.success('Centro de custo atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Error updating cost center:', error);
      toast.error('Erro ao atualizar centro de custo');
    },
  });

  // Delete cost center (soft delete)
  const deleteCostCenter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_cost_centers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-cost-centers', tenantId] });
      toast.success('Centro de custo removido com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting cost center:', error);
      toast.error('Erro ao remover centro de custo');
    },
  });

  return {
    costCenters: costCentersQuery.data || [],
    isLoading: costCentersQuery.isLoading,
    error: costCentersQuery.error,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
  };
};
