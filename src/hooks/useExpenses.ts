import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
type ExpenseCostCenter = Database['public']['Tables']['expense_cost_centers']['Row'];
type ExpenseAllocation = Database['public']['Tables']['expense_allocations']['Row'];

export interface ExpenseWithRelations extends Expense {
  category?: ExpenseCategory | null;
  allocations?: (ExpenseAllocation & { cost_center?: ExpenseCostCenter })[];
}

export interface ExpenseFilters {
  status?: string;
  category_id?: string;
  cost_center_id?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const useExpenses = (filters?: ExpenseFilters) => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  // Realtime subscription for instant sync
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('🔄 Expense realtime update:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Fetch expenses with filters
  const expensesQuery = useQuery({
    queryKey: ['expenses', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('expenses')
        .select(`
          *,
          category:expense_categories(*),
          allocations:expense_allocations(
            *,
            cost_center:expense_cost_centers(*)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.cost_center_id) {
        // Filtrar por centro de custo através da tabela de alocações
        // Nota: Isso pode exigir uma lógica de filtro mais complexa no Supabase
        // ou filtrar no lado do cliente se a volumetria for baixa.
        // Por enquanto, vamos usar a filtragem via RPC ou join se possível.
      }

      if (filters?.dateFrom) {
        query = query.gte('due_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('due_date', filters.dateTo);
      }

      if (filters?.search) {
        query = query.or(`description.ilike.%${filters.search}%,supplier.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      let processedData = data as ExpenseWithRelations[];

      // Filtragem por centro de custo no lado do cliente para garantir precisão com alocações
      if (filters?.cost_center_id) {
        processedData = processedData.filter(expense => 
          expense.allocations?.some(a => a.cost_center_id === filters.cost_center_id)
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Processar status dinamicamente para garantir que despesas a vencer não fiquem com status errado
      processedData = processedData.map(expense => {
        let currentStatus = expense.status;
        
        // Se estiver pendente mas a data já passou, considerar vencida
        if (currentStatus === 'pending') {
          const dueDate = new Date(expense.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            currentStatus = 'overdue';
          }
        }
        
        return {
          ...expense,
          status: currentStatus
        };
      });

      return processedData as ExpenseWithRelations[];
    },
    enabled: !!tenantId,
  });

  // Create expense
  const createExpense = useMutation({
    mutationFn: async (data: {
      expense: Omit<ExpenseInsert, 'tenant_id'>;
      allocations?: { cost_center_id: string; percentage: number }[];
    }) => {
      if (!tenantId) throw new Error('Tenant não selecionado');

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({ ...data.expense, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;

      // Create allocations if provided
      if (data.allocations?.length) {
        const allocationsToInsert = data.allocations.map(a => ({
          expense_id: expense.id,
          cost_center_id: a.cost_center_id,
          percentage: a.percentage,
          amount: (expense.amount * a.percentage) / 100,
        }));

        const { error: allocError } = await supabase
          .from('expense_allocations')
          .insert(allocationsToInsert);

        if (allocError) throw allocError;
      }

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      toast.success('Despesa criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating expense:', error);
      toast.error('Erro ao criar despesa');
    },
  });

  // Update expense
  const updateExpense = useMutation({
    mutationFn: async (data: {
      id: string;
      expense: ExpenseUpdate;
      allocations?: { cost_center_id: string; percentage: number }[];
    }) => {
      const { data: expense, error } = await supabase
        .from('expenses')
        .update(data.expense)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;

      // Update allocations if provided
      if (data.allocations !== undefined) {
        // Delete existing allocations
        await supabase
          .from('expense_allocations')
          .delete()
          .eq('expense_id', data.id);

        // Insert new allocations
        if (data.allocations.length > 0) {
          const allocationsToInsert = data.allocations.map(a => ({
            expense_id: data.id,
            cost_center_id: a.cost_center_id,
            percentage: a.percentage,
            amount: (expense.amount * a.percentage) / 100,
          }));

          const { error: allocError } = await supabase
            .from('expense_allocations')
            .insert(allocationsToInsert);

          if (allocError) throw allocError;
        }
      }

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      toast.success('Despesa atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Error updating expense:', error);
      toast.error('Erro ao atualizar despesa');
    },
  });

  // Delete expense
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      toast.success('Despesa excluída com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
      toast.error('Erro ao excluir despesa');
    },
  });

  // Mark as paid
  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      toast.success('Despesa marcada como paga');
    },
    onError: (error) => {
      console.error('Error marking expense as paid:', error);
      toast.error('Erro ao marcar como paga');
    },
  });

  // Cancel expense
  const cancelExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      toast.success('Despesa cancelada');
    },
    onError: (error) => {
      console.error('Error cancelling expense:', error);
      toast.error('Erro ao cancelar despesa');
    },
  });

  // Postpone expense
  const postponeExpense = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const { data: expense } = await supabase
        .from('expenses')
        .select('due_date')
        .eq('id', id)
        .single();

      if (!expense) throw new Error('Despesa não encontrada');

      const newDate = new Date(expense.due_date);
      newDate.setDate(newDate.getDate() + days);

      const { error } = await supabase
        .from('expenses')
        .update({ due_date: newDate.toISOString().split('T')[0] })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      toast.success('Data de vencimento adiada');
    },
    onError: (error) => {
      console.error('Error postponing expense:', error);
      toast.error('Erro ao adiar vencimento');
    },
  });

  // Reactivate cancelled expense
  const reactivateExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'pending', paid_at: null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      toast.success('Despesa reativada com sucesso');
    },
    onError: (error) => {
      console.error('Error reactivating expense:', error);
      toast.error('Erro ao reativar despesa');
    },
  });

  // Calculate totals
  const totals = {
    pending: expensesQuery.data?.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0) || 0,
    overdue: expensesQuery.data?.filter(e => e.status === 'overdue').reduce((sum, e) => sum + e.amount, 0) || 0,
    paid: expensesQuery.data?.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0) || 0,
    cancelled: expensesQuery.data?.filter(e => e.status === 'cancelled').reduce((sum, e) => sum + e.amount, 0) || 0,
    total: expensesQuery.data?.filter(e => e.status !== 'cancelled').reduce((sum, e) => sum + e.amount, 0) || 0,
  };

  return {
    expenses: expensesQuery.data || [],
    isLoading: expensesQuery.isLoading,
    error: expensesQuery.error,
    totals,
    createExpense,
    updateExpense,
    deleteExpense,
    markAsPaid,
    cancelExpense,
    postponeExpense,
    reactivateExpense,
    refetch: expensesQuery.refetch,
  };
};
