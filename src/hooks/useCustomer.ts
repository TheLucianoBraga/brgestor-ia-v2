import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { customerService, CustomerData, CustomerAddress, CustomerUpdate } from '@/services/customerService';
import { toast } from 'sonner';

interface UseCustomerOptions {
  /** Se deve buscar por customer_tenant_id ao invés de id */
  byTenantId?: boolean;
}

/**
 * Hook unificado para gerenciar dados de um Customer.
 * Usado tanto no Portal quanto no App/Cliente.
 * 
 * @param customerId - ID do customer (ou customer_tenant_id se byTenantId=true)
 * @param options - Opções do hook
 */
export function useCustomer(customerId: string | undefined, options?: UseCustomerOptions) {
  const queryClient = useQueryClient();
  const byTenantId = options?.byTenantId ?? false;

  // Query key baseado no tipo de busca
  const queryKey = byTenantId 
    ? ['customer-by_tenant', customerId] 
    : ['customer', customerId];

  // ========== Query: Buscar Customer ==========
  const customerQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!customerId) return null;
      
      if (byTenantId) {
        return customerService.getByTenantId(customerId);
      }
      return customerService.getById(customerId);
    },
    enabled: !!customerId,
  });

  // ========== Query: Buscar Endereço ==========
  const addressQuery = useQuery({
    queryKey: ['customer_address', customerQuery.data?.id],
    queryFn: async () => {
      if (!customerQuery.data?.id) return null;
      return customerService.getAddress(customerQuery.data.id);
    },
    enabled: !!customerQuery.data?.id,
  });

  // ========== Mutation: Atualizar Customer ==========
  const updateCustomerMutation = useMutation({
    mutationFn: async (updates: CustomerUpdate) => {
      if (!customerQuery.data?.id) throw new Error('Customer não encontrado');
      return customerService.update(customerQuery.data.id, updates);
    },
    onSuccess: (updatedData) => {
      // Invalidar todas as queries relacionadas ao customer
      queryClient.invalidateQueries({ queryKey: ['customer', updatedData.id] });
      queryClient.invalidateQueries({ queryKey: ['customer-by_tenant', updatedData.customer_tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] }); // Lista do App
      queryClient.invalidateQueries({ queryKey: ['cliente_perfil'] }); // Compatibilidade
      toast.success('Dados atualizados com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar dados');
    },
  });

  // ========== Mutation: Atualizar Endereço ==========
  const updateAddressMutation = useMutation({
    mutationFn: async (address: Partial<CustomerAddress>) => {
      if (!customerQuery.data?.id) throw new Error('Customer não encontrado');
      return customerService.upsertAddress(customerQuery.data.id, address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_address', customerQuery.data?.id] });
      toast.success('Endereço atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar endereço');
    },
  });

  // ========== Mutation: Alterar Senha ==========
  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      if (!customerQuery.data?.id) throw new Error('Customer não encontrado');
      const success = await customerService.changePassword(customerQuery.data.id, currentPassword, newPassword);
      if (!success) {
        throw new Error('Senha atual incorreta');
      }
      return true;
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar senha');
    },
  });

  // ========== Realtime Subscription ==========
  useEffect(() => {
    const actualCustomerId = customerQuery.data?.id;
    if (!actualCustomerId) return;

    const channel = supabase
      .channel(`customer-${actualCustomerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${actualCustomerId}`,
        },
        (payload) => {
          // Atualiza o cache do React Query com os novos dados
          const newData = payload.new as CustomerData;
          queryClient.setQueryData(['customer', actualCustomerId], newData);
          if (newData.customer_tenant_id) {
            queryClient.setQueryData(['customer-by_tenant', newData.customer_tenant_id], newData);
          }
          // Também invalida a lista de customers
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerQuery.data?.id, queryClient]);

  // ========== Helper: Buscar CEP ==========
  const searchCep = async (cep: string) => {
    const result = await customerService.searchCep(cep);
    if (!result) {
      toast.error('CEP não encontrado');
      return null;
    }
    return result;
  };

  return {
    // Data
    customer: customerQuery.data ?? null,
    address: addressQuery.data ?? null,
    
    // Loading states
    isLoading: customerQuery.isLoading,
    isLoadingAddress: addressQuery.isLoading,
    
    // Mutations
    updateCustomer: updateCustomerMutation,
    updateAddress: updateAddressMutation,
    changePassword: changePasswordMutation,
    
    // Helpers
    searchCep,
    
    // Refetch
    refetch: () => {
      customerQuery.refetch();
      addressQuery.refetch();
    },
  };
}

// Re-export types for convenience
export type { CustomerData, CustomerAddress, CustomerUpdate } from '@/services/customerService';

