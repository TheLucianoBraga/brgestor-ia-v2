import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface Plan {
  id: string;
  plan_type: 'adm' | 'revenda';
  created_by_tenant_id: string;
  name: string;
  max_users: number;
  base_price: number;
  per_active_revenda_price: number;
  active: boolean;
  created_at: string;
}

export interface PlanPrice {
  id: string;
  plan_id: string;
  seller_tenant_id: string;
  price_monthly: number;
  active: boolean;
  created_at: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_category: string;
  feature_subcategory: string;
  feature_name: string;
  is_enabled: boolean;
  created_at: string;
}

export interface SelectedFeature {
  category: string;
  subcategory: string;
  feature: string;
}

export interface PlanWithPrice extends Plan {
  price?: PlanPrice;
  effective_price?: number;
  features?: PlanFeature[];
}

export function usePlans() {
  const { currentTenant } = useTenant();
  const [plans, setPlans] = useState<PlanWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMaster = currentTenant?.type === 'master';
  const isAdm = currentTenant?.type === 'adm';
  const isRevenda = currentTenant?.type === 'revenda';

  const fetchPlans = useCallback(async () => {
    if (!currentTenant) {
      setPlans([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch plans (only active ones for non-master)
      let plansQuery = supabase.from('plans').select('*');
      if (!isMaster) {
        plansQuery = plansQuery.eq('active', true);
      }
      const { data: plansData, error: plansError } = await plansQuery.order('created_at', { ascending: false });

      if (plansError) throw plansError;

      // Fetch prices (only active ones)
      const { data: pricesData, error: pricesError } = await supabase
        .from('plan_prices')
        .select('*')
        .eq('active', true);

      if (pricesError) throw pricesError;

      // Fetch features (only enabled ones)
      const { data: featuresData, error: featuresError } = await supabase
        .from('plan_features')
        .select('*')
        .eq('is_enabled', true);

      if (featuresError) throw featuresError;

      // Map plans with their prices and features
      const plansWithPrices: PlanWithPrice[] = (plansData || []).map((plan: any) => {
        // Find price for current tenant or master price
        const ownPrice = (pricesData || []).find(
          (p: any) => p.plan_id === plan.id && p.seller_tenant_id === currentTenant.id
        );
        const masterPrice = (pricesData || []).find(
          (p: any) => p.plan_id === plan.id && p.seller_tenant_id === plan.created_by_tenant_id
        );

        // Find features for this plan
        const planFeatures = (featuresData || []).filter(
          (f: any) => f.plan_id === plan.id
        );

        return {
          ...plan,
          price: ownPrice || masterPrice,
          effective_price: ownPrice?.price_monthly ?? masterPrice?.price_monthly ?? plan.base_price,
          features: planFeatures,
        };
      });

      setPlans(plansWithPrices);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      setError(err.message);
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = useCallback(async (
    data: {
      name: string;
      plan_type: 'adm' | 'revenda';
      max_users: number;
      base_price: number;
      per_active_revenda_price?: number;
    },
    features: SelectedFeature[] = []
  ) => {
    if (!currentTenant || !isMaster) {
      return { success: false, error: 'Sem permissão' };
    }

    try {
      const { data: newPlan, error: insertError } = await supabase
        .from('plans')
        .insert({
          ...data,
          created_by_tenant_id: currentTenant.id,
          per_active_revenda_price: data.per_active_revenda_price || 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create master price
      if (data.base_price > 0) {
        await supabase
          .from('plan_prices')
          .insert({
            plan_id: newPlan.id,
            seller_tenant_id: currentTenant.id,
            price_monthly: data.base_price,
            active: true,
          });
      }

      // Create features
      if (features.length > 0) {
        const featureRecords = features.map((f) => ({
          plan_id: newPlan.id,
          feature_category: f.category,
          feature_subcategory: f.subcategory,
          feature_name: f.feature,
          is_enabled: true,
        }));

        await supabase.from('plan_features').insert(featureRecords);
      }

      await fetchPlans();
      return { success: true, plan: newPlan };
    } catch (err: any) {
      console.error('Error creating plan:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, isMaster, fetchPlans]);

  const updatePlan = useCallback(async (
    planId: string,
    data: Partial<Plan>,
    features?: SelectedFeature[]
  ) => {
    if (!currentTenant || !isMaster) {
      return { success: false, error: 'Sem permissão' };
    }

    try {
      const { error: updateError } = await supabase
        .from('plans')
        .update(data)
        .eq('id', planId);

      if (updateError) throw updateError;

      // Update features if provided
      if (features !== undefined) {
        // Delete existing features
        await supabase.from('plan_features').delete().eq('plan_id', planId);

        // Insert new features
        if (features.length > 0) {
          const featureRecords = features.map((f) => ({
            plan_id: planId,
            feature_category: f.category,
            feature_subcategory: f.subcategory,
            feature_name: f.feature,
            is_enabled: true,
          }));

          await supabase.from('plan_features').insert(featureRecords);
        }
      }

      await fetchPlans();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating plan:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, isMaster, fetchPlans]);

  const deletePlan = useCallback(async (planId: string) => {
    if (!currentTenant || !isMaster) {
      return { success: false, error: 'Sem permissão' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (deleteError) throw deleteError;

      await fetchPlans();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, isMaster, fetchPlans]);

  const upsertPrice = useCallback(async (planId: string, priceMonthly: number) => {
    if (!currentTenant) {
      return { success: false, error: 'Sem permissão' };
    }

    try {
      const { error: upsertError } = await supabase
        .from('plan_prices')
        .upsert({
          plan_id: planId,
          seller_tenant_id: currentTenant.id,
          price_monthly: priceMonthly,
          active: true,
        }, {
          onConflict: 'plan_id,seller_tenant_id'
        });

      if (upsertError) throw upsertError;

      await fetchPlans();
      return { success: true };
    } catch (err: any) {
      console.error('Error upserting price:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchPlans]);

  const getPlanFeatures = useCallback((planId: string): SelectedFeature[] => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan?.features) return [];

    return plan.features.map((f) => ({
      category: f.feature_category,
      subcategory: f.feature_subcategory,
      feature: f.feature_name,
    }));
  }, [plans]);

  return {
    plans,
    isLoading,
    error,
    refetch: fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    upsertPrice,
    getPlanFeatures,
    isMaster,
    isAdm,
    isRevenda,
  };
}
