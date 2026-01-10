import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface DiscountItem {
  id: string;
  discount_id: string;
  item_type: 'plan' | 'product';
  plan_id: string | null;
  product_id: string | null;
  created_at: string;
}

export interface Discount {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: DiscountItem[];
}

export interface DiscountFormData {
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
  plan_ids?: string[];
  product_ids?: string[];
}

export function useTenantDiscounts() {
  const { currentTenant } = useTenant();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscounts = useCallback(async () => {
    if (!currentTenant) {
      setDiscounts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: discountsData, error: fetchError } = await supabase
        .from('discounts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch discount items
      const discountIds = (discountsData || []).map(d => d.id);
      let itemsMap: Record<string, DiscountItem[]> = {};

      if (discountIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('discount_items')
          .select('*')
          .in('discount_id', discountIds);

        itemsData?.forEach((item: any) => {
          if (!itemsMap[item.discount_id]) {
            itemsMap[item.discount_id] = [];
          }
          itemsMap[item.discount_id].push({
            ...item,
            item_type: item.item_type as 'plan' | 'product',
          });
        });
      }

      const enrichedDiscounts: Discount[] = (discountsData || []).map((discount: any) => ({
        ...discount,
        discount_type: discount.discount_type as 'percentage' | 'fixed',
        items: itemsMap[discount.id] || [],
      }));

      setDiscounts(enrichedDiscounts);
    } catch (err: any) {
      console.error('Error fetching discounts:', err);
      setError(err.message);
      setDiscounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const createDiscount = useCallback(async (data: DiscountFormData) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { data: newDiscount, error: insertError } = await supabase
        .from('discounts')
        .insert({
          tenant_id: currentTenant.id,
          name: data.name,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          valid_from: data.valid_from || null,
          valid_until: data.valid_until || null,
          is_active: data.is_active !== false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert discount items
      const itemsToInsert: any[] = [];
      
      data.plan_ids?.forEach(planId => {
        itemsToInsert.push({
          discount_id: newDiscount.id,
          item_type: 'plan',
          plan_id: planId,
          product_id: null,
        });
      });

      data.product_ids?.forEach(productId => {
        itemsToInsert.push({
          discount_id: newDiscount.id,
          item_type: 'product',
          plan_id: null,
          product_id: productId,
        });
      });

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('discount_items')
          .insert(itemsToInsert);

        if (itemsError) console.error('Error inserting discount items:', itemsError);
      }

      await fetchDiscounts();
      return { success: true, discount: newDiscount };
    } catch (err: any) {
      console.error('Error creating discount:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchDiscounts]);

  const updateDiscount = useCallback(async (discountId: string, data: Partial<DiscountFormData>) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { plan_ids, product_ids, ...discountData } = data;

      const { error: updateError } = await supabase
        .from('discounts')
        .update(discountData)
        .eq('id', discountId)
        .eq('tenant_id', currentTenant.id);

      if (updateError) throw updateError;

      // Update discount items if provided
      if (plan_ids !== undefined || product_ids !== undefined) {
        // Delete existing items
        await supabase
          .from('discount_items')
          .delete()
          .eq('discount_id', discountId);

        // Insert new items
        const itemsToInsert: any[] = [];
        
        plan_ids?.forEach(planId => {
          itemsToInsert.push({
            discount_id: discountId,
            item_type: 'plan',
            plan_id: planId,
            product_id: null,
          });
        });

        product_ids?.forEach(productId => {
          itemsToInsert.push({
            discount_id: discountId,
            item_type: 'product',
            plan_id: null,
            product_id: productId,
          });
        });

        if (itemsToInsert.length > 0) {
          await supabase
            .from('discount_items')
            .insert(itemsToInsert);
        }
      }

      await fetchDiscounts();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating discount:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchDiscounts]);

  const deleteDiscount = useCallback(async (discountId: string) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { error: deleteError } = await supabase
        .from('discounts')
        .delete()
        .eq('id', discountId)
        .eq('tenant_id', currentTenant.id);

      if (deleteError) throw deleteError;
      await fetchDiscounts();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting discount:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchDiscounts]);

  const toggleActive = useCallback(async (discountId: string, isActive: boolean) => {
    return updateDiscount(discountId, { is_active: isActive });
  }, [updateDiscount]);

  // Get applicable discounts for a plan or product
  const getDiscountsForItem = useCallback((itemType: 'plan' | 'product', itemId: string) => {
    return discounts.filter(d => 
      d.is_active && 
      d.items?.some(item => 
        item.item_type === itemType && 
        (itemType === 'plan' ? item.plan_id === itemId : item.product_id === itemId)
      )
    );
  }, [discounts]);

  return {
    discounts,
    activeDiscounts: discounts.filter(d => d.is_active),
    isLoading,
    error,
    refetch: fetchDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    toggleActive,
    getDiscountsForItem,
  };
}
