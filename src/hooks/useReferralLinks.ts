import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface RefCode {
  code: number;
  kind: string;
  owner_tenant_id: string;
  active: boolean;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ReferralLink {
  id: string;
  tenant_id: string;
  ref_code: number;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  is_active: boolean;
  total_referrals: number;
  total_earned: number;
  created_at: string;
}

export interface ReferralLinkWithCode extends ReferralLink {
  ref_codes?: RefCode;
}

export interface ReferralHistory {
  id: string;
  referral_link_id: string;
  referred_tenant_id: string | null;
  status: 'pending' | 'paid';
  commission_amount: number;
  created_at: string;
  referred_tenant?: {
    name: string;
    type: string;
  };
}

export interface CreateRefCodeParams {
  kind: 'signup_cliente' | 'signup_revenda' | 'invite_user' | 'trial_revenda';
  payload?: Record<string, unknown>;
  commission_type?: 'percentage' | 'fixed';
  commission_value?: number;
}

export const useReferralLinks = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  // Buscar ref_codes do tenant
  const { data: refCodes = [], isLoading: isLoadingCodes } = useQuery({
    queryKey: ['ref_codes', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ref_codes')
        .select('*')
        .eq('owner_tenant_id', currentTenant!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RefCode[];
    },
    enabled: !!currentTenant?.id,
  });

  // Buscar referral_links do tenant com ref_codes
  const { data: referralLinks = [], isLoading: isLoadingLinks } = useQuery({
    queryKey: ['referral_links', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_links')
        .select('*')
        .eq('tenant_id', currentTenant!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReferralLink[];
    },
    enabled: !!currentTenant?.id,
  });

  // Buscar histórico de indicações
  const { data: referralHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['referral_history', currentTenant?.id],
    queryFn: async () => {
      if (!referralLinks.length) return [];

      const linkIds = referralLinks.map(l => l.id);
      const { data, error } = await supabase
        .from('referral_history')
        .select('*')
        .in('referral_link_id', linkIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar nomes dos tenants referidos
      const enriched = await Promise.all(
        (data || []).map(async (item) => {
          let referred_tenant = { name: 'Aguardando...', type: '' };

          if (item.referred_tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('name, type')
              .eq('id', item.referred_tenant_id)
              .maybeSingle();

            if (tenant) {
              referred_tenant = tenant;
            }
          }

          return {
            ...item,
            referred_tenant,
            status: item.status as 'pending' | 'paid',
          };
        })
      );

      return enriched as ReferralHistory[];
    },
    enabled: !!currentTenant?.id && referralLinks.length > 0,
  });

  // Criar novo ref_code
  const createRefCode = useMutation({
    mutationFn: async (params: CreateRefCodeParams) => {
      // 1. Criar ref_code
      const insertData = {
        owner_tenant_id: currentTenant!.id,
        kind: params.kind,
        payload: (params.payload || {}) as unknown as null,
        active: true,
      };

      const { data: refCode, error: refError } = await supabase
        .from('ref_codes')
        .insert([insertData])
        .select()
        .single();

      if (refError) throw refError;

      // 2. Se for tipo que precisa de referral_link (signup_cliente, signup_revenda)
      if (['signup_cliente', 'signup_revenda', 'trial_revenda'].includes(params.kind)) {
        const { error: linkError } = await supabase
          .from('referral_links')
          .insert({
            tenant_id: currentTenant!.id,
            ref_code: refCode.code,
            commission_type: params.commission_type || 'percentage',
            commission_value: params.commission_value || 0,
            is_active: true,
          });

        if (linkError) throw linkError;
      }

      return refCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ref_codes'] });
      queryClient.invalidateQueries({ queryKey: ['referral_links'] });
      toast.success('Link criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar link: ' + error.message);
    },
  });

  // Atualizar ref_code
  const updateRefCode = useMutation({
    mutationFn: async ({ code, active }: { code: number; active: boolean }) => {
      const { error } = await supabase
        .from('ref_codes')
        .update({ active })
        .eq('code', code);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ref_codes'] });
      toast.success('Link atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Atualizar referral_link (comissões)
  const updateReferralLink = useMutation({
    mutationFn: async ({
      id,
      commission_type,
      commission_value,
      is_active,
    }: {
      id: string;
      commission_type?: 'percentage' | 'fixed';
      commission_value?: number;
      is_active?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (commission_type !== undefined) updates.commission_type = commission_type;
      if (commission_value !== undefined) updates.commission_value = commission_value;
      if (is_active !== undefined) updates.is_active = is_active;

      const { error } = await supabase
        .from('referral_links')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral_links'] });
      toast.success('Configuração atualizada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Deletar ref_code
  const deleteRefCode = useMutation({
    mutationFn: async (code: number) => {
      const { error } = await supabase
        .from('ref_codes')
        .delete()
        .eq('code', code);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ref_codes'] });
      queryClient.invalidateQueries({ queryKey: ['referral_links'] });
      toast.success('Link excluído!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  // Agrupar códigos por tipo
  const groupedCodes = {
    cliente: refCodes.filter(c => c.kind === 'signup_cliente'),
    revenda: refCodes.filter(c => c.kind === 'signup_revenda' || c.kind === 'trial_revenda'),
    adm: refCodes.filter(c => c.kind === 'invite_user'),
  };

  // Estatísticas
  const stats = {
    totalReferrals: referralLinks.reduce((acc, l) => acc + (l.total_referrals || 0), 0),
    totalEarned: referralLinks.reduce((acc, l) => acc + (l.total_earned || 0), 0),
    pendingCommissions: referralHistory.filter(h => h.status === 'pending').reduce((acc, h) => acc + h.commission_amount, 0),
    paidCommissions: referralHistory.filter(h => h.status === 'paid').reduce((acc, h) => acc + h.commission_amount, 0),
  };

  return {
    refCodes,
    referralLinks,
    referralHistory,
    groupedCodes,
    stats,
    isLoading: isLoadingCodes || isLoadingLinks || isLoadingHistory,
    createRefCode,
    updateRefCode,
    updateReferralLink,
    deleteRefCode,
  };
};

