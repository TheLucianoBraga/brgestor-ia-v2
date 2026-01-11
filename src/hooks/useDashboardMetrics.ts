import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { startOfMonth, endOfMonth, subMonths, format, addDays } from 'date-fns';

interface DashboardMetrics {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  activeCustomers: number;
  pendingCharges: number;
  conversionRate: number;
  revenueByMonth: { month: string; revenue: number }[];
  upcomingDueDates: {
    id: string;
    customerName: string;
    customerPhone: string;
    dueDate: string;
    amount: number;
    productName: string;
  }[];
  recentActivity: {
    id: string;
    action: string;
    resource: string;
    createdAt: string;
    details: Record<string, unknown> | null;
  }[];
  // Novas métricas de cobrança
  activeDebt: number;
  overdueCount: number;
  forecastNext7Days: number;
  forecastCount: number;
}

export function useDashboardMetrics() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Realtime subscription for instant dashboard sync
  useEffect(() => {
    if (!currentTenant?.id) return;

    // Subscribe to multiple tables for comprehensive dashboard updates
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_charges' },
        () => {
          console.log('🔄 Dashboard realtime: customer_charges changed');
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', currentTenant.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          console.log('🔄 Dashboard realtime: customers changed');
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', currentTenant.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_items' },
        () => {
          console.log('🔄 Dashboard realtime: customer_items changed');
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', currentTenant.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_plan_subscriptions' },
        () => {
          console.log('🔄 Dashboard realtime: subscriptions changed');
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', currentTenant.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, queryClient]);

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics', currentTenant?.id],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!currentTenant?.id) {
        throw new Error('No tenant selected');
      }

      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));
      const next7Days = addDays(now, 7);
      const todayStr = format(now, 'yyyy-MM-dd');

      const tenantId = currentTenant.id;
      
      // Helper to break TypeScript inference chain
      const query = (table: string) => (supabase as any).from(table);
      
      // First, get child tenants to exclude their owners from customer count
      const { data: childTenants } = await supabase
        .from('tenants')
        .select('customer_id')
        .or(`parent_tenant_id.eq.${tenantId},owner_tenant_id.eq.${tenantId}`);

      const excludeCustomerIds = childTenants?.map(t => t.customer_id).filter(Boolean) || [];

      // Fetch queries in parallel to improve performance
      const [
        monthlyItemsResult,
        previousMonthItemsResult,
        monthlyChargesResult,
        previousMonthChargesResult,
        activeCustomersResult,
        pendingChargesResult,
        totalItemsResult,
        activeItemsResult
      ] = await Promise.all([
        query('customer_items')
          .select('price, customer_id, customers!inner(tenant_id)')
          .eq('customers.tenant_id', tenantId)
          .gte('created_at', currentMonthStart.toISOString())
          .lte('created_at', currentMonthEnd.toISOString())
          .eq('status', 'active'),
        query('customer_items')
          .select('price, customers!inner(tenant_id)')
          .eq('customers.tenant_id', tenantId)
          .gte('created_at', previousMonthStart.toISOString())
          .lte('created_at', previousMonthEnd.toISOString())
          .eq('status', 'active'),
        query('customer_charges')
          .select('amount')
          .eq('tenant_id', tenantId)
          .gte('paid_at', currentMonthStart.toISOString())
          .lte('paid_at', currentMonthEnd.toISOString())
          .eq('status', 'paid'),
        query('customer_charges')
          .select('amount')
          .eq('tenant_id', tenantId)
          .gte('paid_at', previousMonthStart.toISOString())
          .lte('paid_at', previousMonthEnd.toISOString())
          .eq('status', 'paid'),
        // Contar APENAS clientes com serviços/itens ativos (clientes reais)
        query('customers')
          .select('id, customer_items!inner(id)', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .eq('customer_items.status', 'active'),
        query('customer_charges')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'pending'),
        query('customer_items')
          .select('id, customers!inner(tenant_id)', { count: 'exact', head: true })
          .eq('customers.tenant_id', tenantId),
        query('customer_items')
          .select('id, customers!inner(tenant_id)', { count: 'exact', head: true })
          .eq('customers.tenant_id', tenantId)
          .eq('status', 'active')
      ]);

      // Revenue by month (last 6 months) - Otimizado para uma única consulta por tabela
      const sixMonthsAgo = startOfMonth(subMonths(now, 5));
      
      const [allRecentItems, allRecentCharges] = await Promise.all([
        query('customer_items')
          .select('price, created_at, customers!inner(tenant_id)')
          .eq('customers.tenant_id', tenantId)
          .gte('created_at', sixMonthsAgo.toISOString())
          .eq('status', 'active'),
        query('customer_charges')
          .select('amount, paid_at')
          .eq('tenant_id', tenantId)
          .gte('paid_at', sixMonthsAgo.toISOString())
          .eq('status', 'paid')
      ]);

      const months: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        
        const itemsRev = allRecentItems.data?.filter((item: any) => {
          const d = new Date(item.created_at);
          return d >= mStart && d <= mEnd;
        }).reduce((sum: number, p: any) => sum + Number(p.price || 0), 0) || 0;

        const chargesRev = allRecentCharges.data?.filter((charge: any) => {
          const d = new Date(charge.paid_at);
          return d >= mStart && d <= mEnd;
        }).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0;
        
        months.push({
          month: format(monthDate, 'MMM'),
          revenue: itemsRev + chargesRev,
        });
      }
      const revenueByMonthResult = months;

      // Upcoming due dates (next 7 days)
      const upcomingDueDatesResult: { data: any[] | null } = await query('customer_items')
        .select(`
          id,
          due_date,
          price,
          product_name,
          customers!inner (
            full_name,
            whatsapp,
            tenant_id
          )
        `)
        .eq('customers.tenant_id', tenantId)
        .gte('due_date', format(now, 'yyyy-MM-dd'))
        .lte('due_date', format(next7Days, 'yyyy-MM-dd'))
        .eq('status', 'active')
        .order('due_date', { ascending: true })
        .limit(5);

      // Recent activity
      const recentActivityResult: { data: any[] | null } = await query('activity_logs')
        .select('id, action, resource, created_at, details')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Dívida Ativa - customer_charges vencidas não pagas
      const overdueChargesResult: { data: { amount: number }[] | null } = await query('customer_charges')
        .select('amount')
        .eq('tenant_id', tenantId)
        .lt('due_date', todayStr)
        .in('status', ['pending', 'overdue']);

      // Previsão de recebimento - próximos 7 dias
      const forecastPaymentsResult: { data: { amount: number }[] | null } = await query('customer_charges')
        .select('amount')
        .eq('tenant_id', tenantId)
        .gte('due_date', todayStr)
        .lte('due_date', format(next7Days, 'yyyy-MM-dd'))
        .eq('status', 'pending');

      // Calculate metrics - combinar customer_items + customer_charges
      const itemsRevenue = monthlyItemsResult.data?.reduce(
        (sum, p) => sum + Number(p.price || 0), 0
      ) || 0;
      const chargesRevenue = monthlyChargesResult.data?.reduce(
        (sum, p) => sum + Number(p.amount || 0), 0
      ) || 0;
      const monthlyRevenue = itemsRevenue + chargesRevenue;

      const prevItemsRevenue = previousMonthItemsResult.data?.reduce(
        (sum, p) => sum + Number(p.price || 0), 0
      ) || 0;
      const prevChargesRevenue = previousMonthChargesResult.data?.reduce(
        (sum, p) => sum + Number(p.amount || 0), 0
      ) || 0;
      const previousMonthRevenue = prevItemsRevenue + prevChargesRevenue;

      // activeCustomersResult é o retorno da função async { count: number }
      const activeCustomers = activeCustomersResult?.count || 0;
      const pendingCharges = pendingChargesResult.count || 0;
      
      // Taxa de conversão baseada em serviços ativos
      const totalItems = totalItemsResult.count || 0;
      const activeItems = activeItemsResult.count || 0;
      const conversionRate = totalItems > 0 ? (activeItems / totalItems) * 100 : 0;

      // Novas métricas
      const activeDebt = overdueChargesResult.data?.reduce(
        (sum, p) => sum + Number(p.amount || 0), 0
      ) || 0;
      const overdueCount = overdueChargesResult.data?.length || 0;

      const forecastNext7Days = forecastPaymentsResult.data?.reduce(
        (sum, p) => sum + Number(p.amount || 0), 0
      ) || 0;
      const forecastCount = forecastPaymentsResult.data?.length || 0;

      const upcomingDueDates = (upcomingDueDatesResult.data || []).map((item: any) => ({
        id: item.id,
        customerName: item.customers?.full_name || 'Cliente',
        customerPhone: item.customers?.whatsapp || '',
        dueDate: item.due_date,
        amount: item.price || 0,
        productName: item.product_name,
      }));

      const recentActivity = (recentActivityResult.data || []).map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        createdAt: log.created_at || '',
        details: log.details as Record<string, unknown> | null,
      }));

      return {
        monthlyRevenue,
        previousMonthRevenue,
        activeCustomers,
        pendingCharges,
        conversionRate,
        revenueByMonth: revenueByMonthResult,
        upcomingDueDates,
        recentActivity,
        activeDebt,
        overdueCount,
        forecastNext7Days,
        forecastCount,
      };
    },
    enabled: !!currentTenant?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  const revenueChange = metrics?.previousMonthRevenue
    ? ((metrics.monthlyRevenue - metrics.previousMonthRevenue) / metrics.previousMonthRevenue) * 100
    : 0;

  return {
    metrics,
    isLoading,
    error,
    revenueChange,
  };
}
