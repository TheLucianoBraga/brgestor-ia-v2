import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportMetrics {
  currentRevenue: number;
  previousRevenue: number;
  revenueChange: number;
  activeClients: number;
  previousActiveClients: number;
  totalClients: number;
  overdueCount: number;
  overduePercentage: number;
  previousOverduePercentage: number;
  averageTicket: number;
  previousAverageTicket: number;
  resellerCount: number;
  resellerActiveItems: number;
  resellerRevenue: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  value: number;
}

export interface TopService {
  name: string;
  count: number;
  revenue: number;
}

export interface Transaction {
  id: string;
  client_name: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

export const useReports = (dateRange: DateRange, statusFilter: string = 'all') => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  // Calculate previous period for comparison
  const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  const previousFrom = subDays(dateRange.from, periodDays);
  const previousTo = subDays(dateRange.to, periodDays);

  // Metrics query
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['report-metrics', tenantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<ReportMetrics> => {
      if (!tenantId) {
        return {
          currentRevenue: 0,
          previousRevenue: 0,
          revenueChange: 0,
          activeClients: 0,
          previousActiveClients: 0,
          totalClients: 0,
          overdueCount: 0,
          overduePercentage: 0,
          previousOverduePercentage: 0,
          averageTicket: 0,
          previousAverageTicket: 0,
          resellerCount: 0,
          resellerActiveItems: 0,
          resellerRevenue: 0,
        };
      }

      // Current period - customer_items (serviços ativos)
      const { data: currentItems } = await supabase
        .from('customer_items')
        .select('price, status, customers!inner(tenant_id)')
        .eq('customers.tenant_id', tenantId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      // Current period charges
      const { data: currentCharges } = await supabase
        .from('customer_charges')
        .select('amount, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      // Previous period - customer_items
      const { data: previousItems } = await supabase
        .from('customer_items')
        .select('price, status, customers!inner(tenant_id)')
        .eq('customers.tenant_id', tenantId)
        .gte('created_at', startOfDay(previousFrom).toISOString())
        .lte('created_at', endOfDay(previousTo).toISOString());

      // Previous period charges
      const { data: previousCharges } = await supabase
        .from('customer_charges')
        .select('amount, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfDay(previousFrom).toISOString())
        .lte('created_at', endOfDay(previousTo).toISOString());

      // All customers - using customers table
      const { data: customers } = await supabase
        .from('customers')
        .select('id, status')
        .eq('tenant_id', tenantId);

      // Buscar clientes com serviços ativos APENAS deste tenant
      const { data: activeServiceCustomers } = await supabase
        .from('customer_items')
        .select('customer_id, customers!inner(tenant_id)')
        .eq('status', 'active')
        .eq('customers.tenant_id', tenantId);
      
      // Buscar TODOS os items expirados atuais (para inadimplência)
      const { data: allExpiredItems } = await supabase
        .from('customer_items')
        .select('id, price, customers!inner(tenant_id)')
        .eq('status', 'expired')
        .eq('customers.tenant_id', tenantId);
      
      // Criar set de IDs únicos de clientes com serviços ativos
      const activeCustomerIds = new Set(
        activeServiceCustomers?.map(i => i.customer_id) || []
      );

      // Calcular receita de CLIENTES (items ativos + cobranças pagas)
      const clientItemsRevenue = currentItems
        ?.filter((i: any) => i.status === 'active')
        .reduce((sum, i: any) => sum + Number(i.price || 0), 0) || 0;
      const clientChargesRevenue = currentCharges
        ?.filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const clientRevenue = clientItemsRevenue + clientChargesRevenue;
      
      // Buscar receita de REVENDAS e ADMINS (subscriptions ativas)
      const { data: childTenantSubs } = await supabase
        .from('subscriptions')
        .select('price')
        .eq('seller_tenant_id', tenantId)
        .eq('status', 'active');
      
      const resellerAdminRevenue = childTenantSubs?.reduce((sum, sub: any) => {
        return sum + Number(sub.price || 0);
      }, 0) || 0;
      
      // Receita total = clientes + revendas/admins
      const currentRevenue = clientRevenue + resellerAdminRevenue;

      const prevItemsRevenue = previousItems
        ?.filter((i: any) => i.status === 'active')
        .reduce((sum, i: any) => sum + Number(i.price || 0), 0) || 0;
      const prevChargesRevenue = previousCharges
        ?.filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const previousRevenue = prevItemsRevenue + prevChargesRevenue;

      const revenueChange = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0 ? 100 : 0;

      const totalClients = customers?.length || 0;
      // Um cliente é ativo APENAS se tiver serviços ativos reais neste tenant
      const activeClients = activeCustomerIds.size;

      // Inadimplência = items vencidos (expired) ou cobranças vencidas (overdue) - ATUAL, não por período
      const expiredItemsCount = allExpiredItems?.length || 0;
      const overdueChargesCount = currentCharges?.filter((c) => c.status === 'overdue').length || 0;
      const overdueCount = expiredItemsCount + overdueChargesCount;
      
      const totalActiveItems = activeServiceCustomers?.length || 0;
      const totalForPercentage = totalActiveItems + expiredItemsCount;
      const overduePercentage = totalForPercentage > 0 ? (expiredItemsCount / totalForPercentage) * 100 : 0;

      // Ticket médio = receita total / quantidade total de serviços ativos
      const averageTicket = totalActiveItems > 0
        ? currentRevenue / totalActiveItems
        : 0;

      // Calculate previous period metrics
      const previousOverdueCount = previousCharges?.filter((c) => c.status === 'overdue').length || 0;
      const previousTotalCharges = previousCharges?.length || 0;
      const previousOverduePercentage = previousTotalCharges > 0 ? (previousOverdueCount / previousTotalCharges) * 100 : 0;

      const previousActiveItems = totalActiveItems > 0 
        ? Math.round(totalActiveItems * (previousRevenue / (currentRevenue || 1)))
        : 0;

      const previousAverageTicket = previousActiveItems > 0
        ? previousRevenue / previousActiveItems
        : 0;

      // Buscar revendas e admins ativos
      const { data: activeChildTenants } = await supabase
        .from('tenants')
        .select('id, type')
        .or(`parent_tenant_id.eq.${tenantId},owner_tenant_id.eq.${tenantId}`)
        .eq('status', 'active')
        .in('type', ['revenda', 'adm']);

      const previousActiveClients = Math.round(activeClients * (previousRevenue / (currentRevenue || 1)));

      const resellerAndAdminTenants = activeChildTenants || [];
      const resellerCount = resellerAndAdminTenants.length;
      
      const childTenantIds = resellerAndAdminTenants.map(t => t.id);
      let resellerActiveItems = 0;
      let resellerRevenue = 0;
      
      if (childTenantIds.length > 0) {
        const { data: resellerItems } = await supabase
          .from('customer_items')
          .select('id')
          .in('customers.tenant_id', childTenantIds)
          .eq('status', 'active');
        
        resellerActiveItems = resellerItems?.length || 0;

        const { data: resellerSubscriptions } = await supabase
          .from('subscriptions')
          .select('price')
          .eq('seller_tenant_id', tenantId)
          .in('buyer_tenant_id', childTenantIds)
          .eq('status', 'active');
        
        resellerRevenue = resellerSubscriptions?.reduce((sum, s) => sum + Number(s.price || 0), 0) || 0;
      }

      return {
        currentRevenue,
        previousRevenue,
        revenueChange,
        activeClients,
        previousActiveClients,
        totalClients,
        overdueCount,
        overduePercentage,
        previousOverduePercentage,
        averageTicket,
        previousAverageTicket,
        resellerCount,
        resellerActiveItems,
        resellerRevenue,
      };
    },
    enabled: !!tenantId,
  });

  // Daily revenue query - include customer_items revenue as well
  const { data: dailyRevenue = [], isLoading: dailyLoading } = useQuery({
    queryKey: ['report-daily-revenue', tenantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<DailyRevenue[]> => {
      if (!tenantId) return [];

      // Get paid charges
      const { data: charges } = await supabase
        .from('customer_charges')
        .select('amount, status, paid_at, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')
        .gte('paid_at', startOfDay(dateRange.from).toISOString())
        .lte('paid_at', endOfDay(dateRange.to).toISOString());

      // Get customer items created in the period (active ones represent revenue)
      const { data: items } = await supabase
        .from('customer_items')
        .select('price, created_at, customers!inner(tenant_id)')
        .eq('customers.tenant_id', tenantId)
        .eq('status', 'active')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      // Group by date
      const grouped: Record<string, { revenue: number; count: number }> = {};

      // Add charges
      (charges || []).forEach(charge => {
        const dateStr = charge.paid_at || charge.created_at;
        const date = format(new Date(dateStr), 'yyyy-MM-dd');
        if (!grouped[date]) {
          grouped[date] = { revenue: 0, count: 0 };
        }
        grouped[date].revenue += Number(charge.amount);
        grouped[date].count += 1;
      });

      // Add items
      (items || []).forEach((item: any) => {
        const date = format(new Date(item.created_at), 'yyyy-MM-dd');
        if (!grouped[date]) {
          grouped[date] = { revenue: 0, count: 0 };
        }
        grouped[date].revenue += Number(item.price || 0);
        grouped[date].count += 1;
      });

      return Object.entries(grouped)
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          count: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!tenantId,
  });

  // Status distribution query - include customer_items
  const { data: statusDistribution = [], isLoading: statusLoading } = useQuery({
    queryKey: ['report-status-distribution', tenantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<StatusDistribution[]> => {
      if (!tenantId) return [];

      // Get charges
      const { data: charges } = await supabase
        .from('customer_charges')
        .select('amount, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      // Get customer items
      const { data: items } = await supabase
        .from('customer_items')
        .select('price, status, customers!inner(tenant_id)')
        .eq('customers.tenant_id', tenantId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      // Group by status
      const grouped: Record<string, { count: number; value: number }> = {};
      
      // Map item status to charge-like status
      const itemStatusMap: Record<string, string> = {
        active: 'paid',
        pending: 'pending',
        expired: 'overdue',
        cancelled: 'cancelled',
      };

      // Add charges
      (charges || []).forEach(charge => {
        const status = charge.status;
        if (!grouped[status]) {
          grouped[status] = { count: 0, value: 0 };
        }
        grouped[status].count += 1;
        grouped[status].value += Number(charge.amount);
      });

      // Add items
      (items || []).forEach((item: any) => {
        const status = itemStatusMap[item.status] || item.status;
        if (!grouped[status]) {
          grouped[status] = { count: 0, value: 0 };
        }
        grouped[status].count += 1;
        grouped[status].value += Number(item.price || 0);
      });

      return Object.entries(grouped).map(([status, data]) => ({
        status: STATUS_LABELS[status] || status,
        count: data.count,
        value: data.value,
      }));
    },
    enabled: !!tenantId,
  });

  // Top services query - using customer_items and subscriptions
  const { data: topServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['report-top-services', tenantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<TopService[]> => {
      if (!tenantId) return [];

      // Get customer items (products/plans sold)
      const { data: customerItems } = await supabase
        .from('customer_items')
        .select(`
          product_name,
          plan_name,
          price,
          customer_id,
          customers!inner(tenant_id)
        `)
        .eq('customers.tenant_id', tenantId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      // Group by product/plan name
      const grouped = (customerItems || []).reduce((acc, item) => {
        const name = item.product_name || item.plan_name || 'Sem nome';
        if (!acc[name]) {
          acc[name] = { count: 0, revenue: 0 };
        }
        acc[name].count += 1;
        acc[name].revenue += Number(item.price || 0);
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      return Object.entries(grouped)
        .map(([name, data]) => ({
          name,
          count: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
    enabled: !!tenantId,
  });

  // Transactions query - using customer_charges AND customer_items
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['report-transactions', tenantId, dateRange.from.toISOString(), dateRange.to.toISOString(), statusFilter],
    queryFn: async (): Promise<Transaction[]> => {
      if (!tenantId) return [];

      const results: Transaction[] = [];

      // Get charges
      let chargeQuery = supabase
        .from('customer_charges')
        .select(`
          id,
          amount,
          status,
          due_date,
          paid_at,
          created_at,
          customers!inner(full_name)
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        chargeQuery = chargeQuery.eq('status', statusFilter);
      }

      const { data: charges } = await chargeQuery;

      (charges || []).forEach((charge: any) => {
        results.push({
          id: charge.id,
          client_name: charge.customers?.full_name || 'Cliente não encontrado',
          amount: Number(charge.amount),
          status: charge.status,
          due_date: charge.due_date,
          paid_at: charge.paid_at,
        });
      });

      // Get customer items (map status)
      const itemStatusMap: Record<string, string> = {
        active: 'paid',
        pending: 'pending',
        expired: 'overdue',
        cancelled: 'cancelled',
      };

      let itemQuery = supabase
        .from('customer_items')
        .select(`
          id,
          price,
          status,
          due_date,
          created_at,
          customers!inner(full_name, tenant_id)
        `)
        .eq('customers.tenant_id', tenantId)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at', { ascending: false });

      const { data: items } = await itemQuery;

      (items || []).forEach((item: any) => {
        const mappedStatus = itemStatusMap[item.status] || item.status;
        if (statusFilter === 'all' || mappedStatus === statusFilter) {
          results.push({
            id: item.id,
            client_name: item.customers?.full_name || 'Cliente não encontrado',
            amount: Number(item.price || 0),
            status: mappedStatus,
            due_date: item.due_date,
            paid_at: item.status === 'active' ? item.created_at : null,
          });
        }
      });

      // Sort by created_at desc (most recent first)
      return results.sort((a, b) => {
        const dateA = new Date(a.paid_at || a.due_date || '').getTime();
        const dateB = new Date(b.paid_at || b.due_date || '').getTime();
        return dateB - dateA;
      });
    },
    enabled: !!tenantId,
  });

  return {
    metrics: metrics || {
      currentRevenue: 0,
      previousRevenue: 0,
      revenueChange: 0,
      activeClients: 0,
      previousActiveClients: 0,
      totalClients: 0,
      overdueCount: 0,
      overduePercentage: 0,
      previousOverduePercentage: 0,
      averageTicket: 0,
      previousAverageTicket: 0,
      resellerCount: 0,
      resellerActiveItems: 0,
      resellerRevenue: 0,
    },
    dailyRevenue,
    statusDistribution,
    topServices,
    transactions,
    isLoading: metricsLoading || dailyLoading || statusLoading || servicesLoading || transactionsLoading,
  };
};
