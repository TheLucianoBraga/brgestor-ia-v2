import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface TenantMember {
  user_id: string;
  tenant_id: string;
  role_in_tenant: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    user_id: string;
  };
}

export interface SeatInfo {
  current: number;
  max: number | null;
  available: number | null;
  hasLimit: boolean;
}

export const useTenantMembers = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Fetch current tenant members
  const membersQuery = useQuery({
    queryKey: ['tenant_members', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('tenant_members')
        .select(`
          user_id,
          tenant_id,
          role_in_tenant,
          status,
          created_at,
          profiles:user_id (
            full_name,
            user_id
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((m: any) => ({
        ...m,
        profile: m.profiles,
      })) as TenantMember[];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch seat info for ADM/REVENDA tenants
  const seatInfoQuery = useQuery({
    queryKey: ['seat_info', currentTenant?.id],
    queryFn: async (): Promise<SeatInfo> => {
      if (!currentTenant?.id) {
        return { current: 0, max: null, available: null, hasLimit: false };
      }

      // Count current active members
      const { count: memberCount, error: countError } = await supabase
        .from('tenant_members')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'active');

      if (countError) throw countError;

      const current = memberCount || 0;

      // For ADM/REVENDA, get max_users from system plan
      if (currentTenant.type === 'adm' || currentTenant.type === 'revenda') {
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select(`
            plan_id,
            plans:plan_id (
              max_users
            )
          `)
          .eq('buyer_tenant_id', currentTenant.id)
          .eq('kind', 'system_plan')
          .eq('status', 'active')
          .maybeSingle();

        if (subError) throw subError;

        const maxUsers = (subscription?.plans as any)?.max_users || null;

        return {
          current,
          max: maxUsers,
          available: maxUsers !== null ? maxUsers - current : null,
          hasLimit: maxUsers !== null,
        };
      }

      // Master has no limit
      return { current, max: null, available: null, hasLimit: false };
    },
    enabled: !!currentTenant?.id,
  });

  // Create invite ref_code
  const createInvite = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      // Check seat limit first
      const seatInfo = seatInfoQuery.data;
      if (seatInfo?.hasLimit && seatInfo.available !== null && seatInfo.available <= 0) {
        throw new Error('Limite de assentos atingido. Faça upgrade do plano para convidar mais usuários.');
      }

      const { data, error } = await supabase
        .from('ref_codes')
        .insert({
          owner_tenant_id: currentTenant.id,
          kind: 'invite_user',
          payload: {},
        })
        .select('code')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Convite criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar convite');
    },
  });

  // Deactivate member
  const deactivateMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      const { error } = await supabase
        .from('tenant_members')
        .update({ status: 'inactive' })
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_members'] });
      queryClient.invalidateQueries({ queryKey: ['seat_info'] });
      toast.success('Usuário desativado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao desativar usuário');
    },
  });

  // Reactivate member
  const reactivateMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      // Check seat limit first
      const seatInfo = seatInfoQuery.data;
      if (seatInfo?.hasLimit && seatInfo.available !== null && seatInfo.available <= 0) {
        throw new Error('Limite de assentos atingido. Faça upgrade do plano para reativar usuários.');
      }

      const { error } = await supabase
        .from('tenant_members')
        .update({ status: 'active' })
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_members'] });
      queryClient.invalidateQueries({ queryKey: ['seat_info'] });
      toast.success('Usuário reativado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao reativar usuário');
    },
  });

  // Remove member completely
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      const { error } = await supabase
        .from('tenant_members')
        .delete()
        .eq('tenant_id', currentTenant.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_members'] });
      queryClient.invalidateQueries({ queryKey: ['seat_info'] });
      toast.success('Usuário removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover usuário');
    },
  });

  return {
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    seatInfo: seatInfoQuery.data || { current: 0, max: null, available: null, hasLimit: false },
    seatInfoLoading: seatInfoQuery.isLoading,
    createInvite,
    deactivateMember,
    reactivateMember,
    removeMember,
  };
};

