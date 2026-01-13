import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
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

      const { data, error } = await api.getCoupons();

      if (error) throw new Error(error);

      // Backend já retorna redemption_count
      return (data || []).map(c => ({
        ...c,
        discount_type: c.discount_type as 'percent' | 'fixed',
      })) as Coupon[];
    },
    enabled: !!currentTenant?.id,
  });

  const createCoupon = useMutation({
    mutationFn: async (data: CouponInsert) => {
      if (!currentTenant?.id) throw new Error('No tenant selected');

      const { data: result, error } = await api.createCoupon(data);

      if (error) throw new Error(error);
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
      const { data: result, error } = await api.updateCoupon(id, data);

      if (error) throw new Error(error);
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
      const { error } = await api.updateCoupon(id, { active });

      if (error) throw new Error(error);
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
      const { error } = await api.deleteCoupon(id);
      if (error) throw new Error(error);
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

