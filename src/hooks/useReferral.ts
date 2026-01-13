import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { 
  referralService, 
  ReferralLink, 
  ReferredCustomer, 
  ReferralTransaction, 
  ReferralStats,
  MIN_PAYOUT_AMOUNT 
} from '@/services/referralService';
import { toast } from 'sonner';

interface UseReferralOptions {
  /** Se deve buscar por customer_tenant_id ao invés de customer_id */
  byTenantId?: boolean;
  /** Contexto para gerar a URL correta */
  context?: 'portal' | 'cliente';
  /** Tenant ID adicional para filtrar (usado no portal) */
  tenantId?: string;
}

/**
 * Hook unificado para gerenciar dados de Indicações.
 * Usado tanto no Portal quanto no App/Cliente.
 * 
 * @param customerId - ID do customer (ou customer_tenant_id se byTenantId=true)
 * @param options - Opções do hook
 */
export function useReferral(customerId: string | undefined, options?: UseReferralOptions) {
  const queryClient = useQueryClient();
  const byTenantId = options?.byTenantId ?? false;
  const context = options?.context ?? 'cliente';
  const tenantId = options?.tenantId;

  // Query key baseado no tipo de busca
  const queryKey = byTenantId 
    ? ['referral-by_tenant', customerId] 
    : ['referral', customerId, tenantId];

  // ========== Query: Buscar Referral Link ==========
  const referralLinkQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<ReferralLink | null> => {
      if (!customerId) return null;
      
      if (byTenantId) {
        return referralService.getByCustomerTenantId(customerId);
      }
      return referralService.getByCustomerId(customerId, tenantId);
    },
    enabled: !!customerId,
  });

  // ========== Query: Buscar Clientes Indicados ==========
  const referredUsersQuery = useQuery({
    queryKey: ['referred_users', referralLinkQuery.data?.id],
    queryFn: async (): Promise<ReferredCustomer[]> => {
      if (!referralLinkQuery.data?.id) return [];
      return referralService.getReferredUsers(referralLinkQuery.data.id);
    },
    enabled: !!referralLinkQuery.data?.id,
  });

  // ========== Query: Buscar Transações ==========
  const transactionsQuery = useQuery({
    queryKey: ['referral_transactions', referralLinkQuery.data?.id],
    queryFn: async (): Promise<ReferralTransaction[]> => {
      if (!referralLinkQuery.data?.id) return [];
      return referralService.getTransactions(referralLinkQuery.data.id);
    },
    enabled: !!referralLinkQuery.data?.id,
  });

  // ========== Estatísticas Calculadas ==========
  const stats: ReferralStats = referralService.calculateStats(
    referralLinkQuery.data ?? null,
    referredUsersQuery.data ?? []
  );

  // ========== URL de Indicação ==========
  const referralUrl = referralLinkQuery.data 
    ? referralService.generateReferralUrl(referralLinkQuery.data.ref_code, context)
    : null;

  // ========== Mutation: Solicitar Saque ==========
  const requestPayoutMutation = useMutation({
    mutationFn: async (pixKey: string) => {
      const link = referralLinkQuery.data;
      if (!link) throw new Error('Dados não encontrados');

      return referralService.requestPayout({
        referralLinkId: link.id,
        customerId: link.customer_id,
        tenantId: link.tenant_id,
        amount: stats.availableBalance,
        pixKey
      });
    },
    onSuccess: () => {
      toast.success('Saque solicitado! Aguarde aprovação.');
      invalidateAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // ========== Mutation: Usar como Crédito ==========
  const useCreditMutation = useMutation({
    mutationFn: async () => {
      const link = referralLinkQuery.data;
      if (!link) throw new Error('Dados não encontrados');

      return referralService.useAsCredit({
        referralLinkId: link.id,
        customerId: link.customer_id,
        tenantId: link.tenant_id,
        amount: stats.availableBalance
      });
    },
    onSuccess: (data) => {
      toast.success(`R$ ${data.amount.toFixed(2)} reservado como crédito! Use ao contratar um serviço.`);
      invalidateAll();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // ========== Helper: Invalidar todas as queries ==========
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['referral'] });
    queryClient.invalidateQueries({ queryKey: ['referral-by_tenant'] });
    queryClient.invalidateQueries({ queryKey: ['referred_users'] });
    queryClient.invalidateQueries({ queryKey: ['referral_transactions'] });
    // Compatibilidade com queries antigas
    queryClient.invalidateQueries({ queryKey: ['customer-referral_link'] });
    queryClient.invalidateQueries({ queryKey: ['cliente-referral_link'] });
  };

  // ========== Realtime Subscription ==========
  useEffect(() => {
    const linkId = referralLinkQuery.data?.id;
    if (!linkId) return;

    const channel = supabase
      .channel(`referral-${linkId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_referral_links',
          filter: `id=eq.${linkId}`,
        },
        () => {
          // Atualiza os dados quando houver mudanças
          invalidateAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [referralLinkQuery.data?.id, queryClient]);

  return {
    // Data
    referralLink: referralLinkQuery.data ?? null,
    referralUrl,
    referredUsers: referredUsersQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    stats,
    
    // Loading states
    isLoading: referralLinkQuery.isLoading || referredUsersQuery.isLoading,
    
    // Mutations
    requestPayout: requestPayoutMutation.mutate,
    isRequestingPayout: requestPayoutMutation.isPending,
    useAsCredit: useCreditMutation.mutate,
    isUsingCredit: useCreditMutation.isPending,
    
    // Constants
    minPayoutAmount: MIN_PAYOUT_AMOUNT,
    
    // Refetch
    refetch: () => {
      referralLinkQuery.refetch();
      referredUsersQuery.refetch();
      transactionsQuery.refetch();
    },
  };
}

// Re-export types for convenience
export type { ReferralLink, ReferredCustomer, ReferralTransaction, ReferralStats } from '@/services/referralService';
export { MIN_PAYOUT_AMOUNT } from '@/services/referralService';

