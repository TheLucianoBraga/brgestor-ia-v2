import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
type ExpenseCategoryInsert = Database['public']['Tables']['expense_categories']['Insert'];
type ExpenseCategoryUpdate = Database['public']['Tables']['expense_categories']['Update'];

export const useExpenseCategories = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['expense_categories', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as ExpenseCategory[];
    },
    enabled: !!tenantId,
  });

  // Create category
  const createCategory = useMutation({
    mutationFn: async (data: Omit<ExpenseCategoryInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('Tenant não selecionado');

      const { data: category, error } = await supabase
        .from('expense_categories')
        .insert({ ...data, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_categories', tenantId] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast.error('Erro ao criar categoria');
    },
  });

  // Update category
  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseCategoryUpdate }) => {
      const { data: category, error } = await supabase
        .from('expense_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_categories', tenantId] });
      toast.success('Categoria atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria');
    },
  });

  // Delete category (soft delete)
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_categories', tenantId] });
      toast.success('Categoria removida com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      toast.error('Erro ao remover categoria');
    },
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};

