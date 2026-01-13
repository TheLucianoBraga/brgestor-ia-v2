import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';

export interface TenantPlan {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  duration_months: number;
  entry_fee: number;
  entry_fee_mode: 'separate' | 'first_payment';
  auto_renew: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantPlanFormData {
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  duration_months: number;
  entry_fee?: number;
  entry_fee_mode?: 'separate' | 'first_payment';
  auto_renew?: boolean;
  is_active?: boolean;
}

export function useTenantPlans() {
  const { currentTenant } = useTenant();
  const [plans, setPlans] = useState<TenantPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!currentTenant) {
      setPlans([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tenant_plans')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPlans((data || []) as TenantPlan[]);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = useCallback(async (data: TenantPlanFormData) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { data: newPlan, error: insertError } = await supabase
        .from('tenant_plans')
        .insert({
          tenant_id: currentTenant.id,
          name: data.name,
          description: data.description || null,
          price: data.price,
          cost_price: data.cost_price || 0,
          duration_months: data.duration_months,
          entry_fee: data.entry_fee || 0,
          entry_fee_mode: data.entry_fee_mode || 'separate',
          auto_renew: data.auto_renew !== false,
          is_active: data.is_active !== false,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      await fetchPlans();
      return { success: true, plan: newPlan };
    } catch (err: any) {
      console.error('Error creating plan:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchPlans]);

  const updatePlan = useCallback(async (planId: string, data: Partial<TenantPlanFormData>) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { error: updateError } = await supabase
        .from('tenant_plans')
        .update(data)
        .eq('id', planId)
        .eq('tenant_id', currentTenant.id);

      if (updateError) throw updateError;
      await fetchPlans();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating plan:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchPlans]);

  const deletePlan = useCallback(async (planId: string) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { error: deleteError } = await supabase
        .from('tenant_plans')
        .delete()
        .eq('id', planId)
        .eq('tenant_id', currentTenant.id);

      if (deleteError) throw deleteError;
      await fetchPlans();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchPlans]);

  const toggleActive = useCallback(async (planId: string, isActive: boolean) => {
    return updatePlan(planId, { is_active: isActive });
  }, [updatePlan]);

  return {
    plans,
    activePlans: plans.filter(p => p.is_active),
    isLoading,
    error,
    refetch: fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    toggleActive,
  };
}

