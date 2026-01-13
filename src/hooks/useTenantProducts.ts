import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';

export interface PriceTier {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  created_at: string;
}

export interface TenantProduct {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  cost_price: number;
  sale_price: number;
  has_price_tiers: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  price_tiers?: PriceTier[];
}

export interface TenantProductFormData {
  name: string;
  description?: string;
  cost_price?: number;
  sale_price: number;
  has_price_tiers?: boolean;
  is_active?: boolean;
  price_tiers?: Omit<PriceTier, 'id' | 'product_id' | 'created_at'>[];
}

export function useTenantProducts() {
  const { currentTenant } = useTenant();
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!currentTenant) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: productsData, error: fetchError } = await supabase
        .from('tenant_products')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch price tiers for products with tiers enabled
      const productsWithTiers = productsData?.filter(p => p.has_price_tiers) || [];
      let tiersMap: Record<string, PriceTier[]> = {};

      if (productsWithTiers.length > 0) {
        const { data: tiersData } = await supabase
          .from('product_price_tiers')
          .select('*')
          .in('product_id', productsWithTiers.map(p => p.id))
          .order('min_quantity', { ascending: true });

        tiersData?.forEach(tier => {
          if (!tiersMap[tier.product_id]) {
            tiersMap[tier.product_id] = [];
          }
          tiersMap[tier.product_id].push(tier);
        });
      }

      const enrichedProducts = (productsData || []).map(product => ({
        ...product,
        price_tiers: tiersMap[product.id] || [],
      }));

      setProducts(enrichedProducts);
    } catch (err: any) {
      console.error('Error fetching tenant products:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(async (data: TenantProductFormData) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { data: newProduct, error: insertError } = await supabase
        .from('tenant_products')
        .insert({
          tenant_id: currentTenant.id,
          name: data.name,
          description: data.description || null,
          cost_price: data.cost_price || 0,
          sale_price: data.sale_price,
          has_price_tiers: data.has_price_tiers || false,
          is_active: data.is_active !== false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert price tiers if provided
      if (data.has_price_tiers && data.price_tiers && data.price_tiers.length > 0) {
        const tiersToInsert = data.price_tiers.map(tier => ({
          product_id: newProduct.id,
          min_quantity: tier.min_quantity,
          max_quantity: tier.max_quantity,
          unit_price: tier.unit_price,
        }));

        const { error: tiersError } = await supabase
          .from('product_price_tiers')
          .insert(tiersToInsert);

        if (tiersError) console.error('Error inserting price tiers:', tiersError);
      }

      await fetchProducts();
      return { success: true, product: newProduct };
    } catch (err: any) {
      console.error('Error creating product:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchProducts]);

  const updateProduct = useCallback(async (productId: string, data: Partial<TenantProductFormData>) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { price_tiers, ...productData } = data;

      const { error: updateError } = await supabase
        .from('tenant_products')
        .update(productData)
        .eq('id', productId)
        .eq('tenant_id', currentTenant.id);

      if (updateError) throw updateError;

      // Update price tiers if provided
      if (price_tiers !== undefined) {
        // Delete existing tiers
        await supabase
          .from('product_price_tiers')
          .delete()
          .eq('product_id', productId);

        // Insert new tiers
        if (price_tiers.length > 0) {
          const tiersToInsert = price_tiers.map(tier => ({
            product_id: productId,
            min_quantity: tier.min_quantity,
            max_quantity: tier.max_quantity,
            unit_price: tier.unit_price,
          }));

          await supabase
            .from('product_price_tiers')
            .insert(tiersToInsert);
        }
      }

      await fetchProducts();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating product:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchProducts]);

  const deleteProduct = useCallback(async (productId: string) => {
    if (!currentTenant) return { success: false, error: 'Sem tenant' };

    try {
      const { error: deleteError } = await supabase
        .from('tenant_products')
        .delete()
        .eq('id', productId)
        .eq('tenant_id', currentTenant.id);

      if (deleteError) throw deleteError;
      await fetchProducts();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting product:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchProducts]);

  const toggleActive = useCallback(async (productId: string, isActive: boolean) => {
    return updateProduct(productId, { is_active: isActive });
  }, [updateProduct]);

  return {
    products,
    activeProducts: products.filter(p => p.is_active),
    isLoading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleActive,
  };
}

