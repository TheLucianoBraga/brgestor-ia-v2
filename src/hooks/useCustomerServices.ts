import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-postgres';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  long_description: string | null;
  images: string[];
  benefits: string[];
  price: number;
  billing_type: string;
  interval: string | null;
  commission_type: string;
  commission_value: number;
  recurrence_enabled: boolean;
  recurrence_value: number;
  duration_months: number;
  cta_text: string;
  display_order: number;
  is_featured: boolean;
  active: boolean;
  seller_tenant_id: string;
}

interface CustomerItem {
  id: string;
  customer_id: string;
  product_name: string;
  plan_name: string | null;
  price: number | null;
  discount: number | null;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  due_date: string | null;
  created_at: string;
  duration_months?: number;
  source?: 'customer_items' | 'subscriptions';
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export const useCustomerServices = (customerId?: string) => {
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [customerItems, setCustomerItems] = useState<CustomerItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true })
        .order('name');

      if (error) throw error;
      
      // Map with defaults for new fields
      const mapped = (data || []).map(s => ({
        ...s,
        images: s.images || [],
        benefits: s.benefits || [],
        commission_type: s.commission_type || 'percentage',
        commission_value: s.commission_value || 0,
        recurrence_enabled: s.recurrence_enabled || false,
        recurrence_value: s.recurrence_value || 0,
        duration_months: s.duration_months || 1,
        cta_text: s.cta_text || 'Assinar',
        display_order: s.display_order || 0,
        is_featured: s.is_featured || false,
      }));
      
      setAvailableServices(mapped);
    } catch (err: any) {
      console.error('Error fetching services:', err);
      setError(err.message);
    }
  }, []);

  const fetchCustomerItems = useCallback(async () => {
    if (!customerId) return;

    try {
      // Get customer's tenant_id to find subscriptions
      const { data: customer } = await supabase
        .from('customers')
        .select('tenant_id, customer_tenant_id')
        .eq('id', customerId)
        .maybeSingle();

      const allItems: CustomerItem[] = [];

      // 1. Fetch from customer_items (no FK to services, so just get the fields directly)
      const { data: items, error: itemsError } = await supabase
        .from('customer_items')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (!itemsError && items) {
        allItems.push(...items.map((i: any) => ({ 
          ...i, 
          source: 'customer_items' as const 
        })));
      }

      // 2. Fetch from subscriptions table (buyer_tenant_id = customer's tenant)
      if (customer?.customer_tenant_id) {
        const { data: subscriptions, error: subsError } = await supabase
          .from('subscriptions')
          .select('*, services(name, duration_months)')
          .eq('buyer_tenant_id', customer.customer_tenant_id)
          .order('created_at', { ascending: false });

        if (!subsError && subscriptions) {
          // Map subscriptions to CustomerItem format
          const mappedSubs: CustomerItem[] = subscriptions.map((sub: any) => ({
            id: sub.id,
            customer_id: customerId,
            product_name: sub.services?.name || 'Serviço',
            plan_name: sub.plan_id ? 'Plano' : null,
            price: sub.price,
            discount: null,
            status: sub.status === 'ativo' ? 'active' : sub.status,
            starts_at: sub.starts_at,
            expires_at: sub.expires_at || sub.ends_at,
            due_date: sub.due_date || sub.expires_at || sub.ends_at,
            created_at: sub.created_at,
            duration_months: sub.services?.duration_months,
            source: 'subscriptions' as const,
          }));
          allItems.push(...mappedSubs);
        }
      }

      setCustomerItems(allItems);
    } catch (err: any) {
      console.error('Error fetching customer items:', err);
      setError(err.message);
    }
  }, [customerId]);

  const fetchPayments = useCallback(async () => {
    if (!customerId) return;

    try {
      // First get the customer's tenant_id to filter payments
      const { data: customer } = await supabase
        .from('customers')
        .select('tenant_id, customer_tenant_id')
        .eq('id', customerId)
        .maybeSingle();

      if (!customer) {
        setPayments([]);
        return;
      }

      // Filter payments by buyer_tenant_id (customer's own tenant)
      const buyerTenantId = customer.customer_tenant_id;
      
      if (buyerTenantId) {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('buyer_tenant_id', buyerTenantId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setPayments(data || []);
      } else {
        // Fallback: no payments if no customer_tenant_id
        setPayments([]);
      }
    } catch (err: any) {
      console.error('Error fetching payments:', err);
    }
  }, [customerId]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchAvailableServices(),
      fetchCustomerItems(),
      fetchPayments(),
    ]);
    setIsLoading(false);
  }, [fetchAvailableServices, fetchCustomerItems, fetchPayments]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createCustomerItem = async (item: Omit<CustomerItem, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('customer_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    await fetchCustomerItems();
    return data;
  };

  const updateCustomerItem = async (id: string, updates: Partial<CustomerItem>) => {
    const { error } = await supabase
      .from('customer_items')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchCustomerItems();
  };

  return {
    availableServices,
    customerItems,
    payments,
    isLoading,
    error,
    refetch,
    createCustomerItem,
    updateCustomerItem,
    updatePaymentStatus: async (id: string, status: string) => {
      console.log('Updating payment status:', id, status);
      
      // Atualização otimista no estado local para feedback imediato
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      
      const { error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('Error updating payment status:', error);
        // Reverter em caso de erro
        await fetchPayments();
        throw error;
      }
      
      // Garantir que os dados estão sincronizados
      await fetchPayments();
    },
  };
};
