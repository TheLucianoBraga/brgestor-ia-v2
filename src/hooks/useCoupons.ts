import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface Coupon {
  id: string;
  issuer_tenant_id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions: number | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  redemption_count?: number;
}

export interface CouponInsert {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions?: number | null;
  expires_at?: string | null;
  active?: boolean;
}

export const useCoupons = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const couponsQuery = useQuery({
    queryKey: ['coupons', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('issuer_tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get redemption counts
      const couponIds = data.map(c => c.id);
      if (couponIds.length > 0) {
        const { data: redemptions } = await supabase
          .from('coupon_redemptions')
          .select('coupon_id')
          .in('coupon_id', couponIds);

        const countMap = (redemptions || []).reduce((acc, r) => {
          acc[r.coupon_id] = (acc[r.coupon_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return data.map(c => ({
          ...c,
          discount_type: c.discount_type as 'percent' | 'fixed',
          redemption_count: countMap[c.id] || 0,
        })) as Coupon[];
      }

      return data.map(c => ({
        ...c,
        discount_type: c.discount_type as 'percent' | 'fixed',
        redemption_count: 0,
      })) as Coupon[];
    },
    enabled: !!currentTenant?.id,
  });

  const createCoupon = useMutation({
    mutationFn: async (data: CouponInsert) => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      const { data: result, error } = await supabase
        .from('coupons')
        .insert({
          ...data,
          issuer_tenant_id: currentTenant.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom criado com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key')) {
        toast.error('Já existe um cupom com este código');
      } else {
        toast.error('Erro ao criar cupom');
      }
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CouponInsert>) => {
      const { data: result, error } = await supabase
        .from('coupons')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar cupom');
    },
  });

  const toggleCouponStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('coupons')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success(variables.active ? 'Cupom ativado' : 'Cupom desativado');
    },
    onError: () => {
      toast.error('Erro ao alterar status do cupom');
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir cupom');
    },
  });

  return {
    coupons: couponsQuery.data || [],
    isLoading: couponsQuery.isLoading,
    createCoupon,
    updateCoupon,
    toggleCouponStatus,
    deleteCoupon,
  };
};
