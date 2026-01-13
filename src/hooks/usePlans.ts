import { useState, useCallback, useEffect } from 'react';
import api from '@/services/api';
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
      // Fetch plans
      const { data: plansData, error: plansError } = await api.getPlans();

      if (plansError) throw new Error(plansError);

      // Fetch prices
      const { data: pricesData, error: pricesError } = await api.getAllPrices();

      if (pricesError) throw new Error(pricesError);

      // Fetch features
      const { data: featuresData, error: featuresError } = await api.getAllFeatures();

      if (featuresError) throw new Error(featuresError);

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
      const { data: newPlan, error: insertError } = await api.createPlan({
        ...data,
        per_active_revenda_price: data.per_active_revenda_price || 0,
      });

      if (insertError) throw new Error(insertError);
      const planRecord = newPlan;

      // Create master price
      if (data.base_price > 0) {
        await api.createPlanPrice(planRecord.id, {
          price: data.base_price,
          billing_cycle: 'monthly',
        });
      }

      // Create features
      if (features.length > 0) {
        const featureRecords = features.map((f) => ({
          feature_key: `${f.category}.${f.subcategory}.${f.feature}`,
          feature_value: 'true',
          is_enabled: true,
        }));

        await api.createPlanFeatures(planRecord.id, featureRecords);
      }

      await fetchPlans();
      return { success: true, plan: planRecord };
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
      const { error: updateError } = await api.updatePlan(planId, data);

      if (updateError) throw new Error(updateError);

      // Update features if provided
      if (features !== undefined) {
        // Delete existing features
        await api.deletePlanFeatures(planId);

        // Insert new features
        if (features.length > 0) {
          const featureRecords = features.map((f) => ({
            feature_key: `${f.category}.${f.subcategory}.${f.feature}`,
            feature_value: 'true',
            is_enabled: true,
          }));

          await api.createPlanFeatures(planId, featureRecords);
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
      const { error: deleteError } = await api.deletePlan(planId);

      if (deleteError) throw new Error(deleteError);

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
      // Try to create price (backend handles upsert logic)
      await api.createPlanPrice(planId, {
        price: priceMonthly,
        billing_cycle: 'monthly',
      });

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

