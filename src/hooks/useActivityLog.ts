import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface ActivityLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  resource: string;
  details: Json;
  ip_address: string | null;
  created_at: string;
  user_name?: string;
}

export interface ActivityLogFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  resource?: string;
}

export const useActivityLog = (filters?: ActivityLogFilters, page = 1, pageSize = 20) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: ['activity_logs', currentTenant?.id, filters, page, pageSize],
    queryFn: async () => {
      if (!currentTenant?.id) return { logs: [], total: 0 };

      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59.999Z');
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.resource) {
        query = query.eq('resource', filters.resource);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return { logs: data as ActivityLog[], total: count || 0 };
    },
    enabled: !!currentTenant?.id,
  });

  const logActivity = useMutation({
    mutationFn: async ({
      action,
      resource,
      details = {},
    }: {
      action: string;
      resource: string;
      details?: Json;
    }) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      const { error } = await supabase.from('activity_logs').insert([{
        tenant_id: currentTenant.id,
        user_id: user?.id || null,
        action,
        resource,
        details,
        ip_address: null, // IP is captured server-side if needed
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity_logs'] });
    },
  });

  // Get unique actions from logs for filter dropdown
  const actionsQuery = useQuery({
    queryKey: ['activity-log_actions', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('activity_logs')
        .select('action')
        .order('action');

      if (error) throw error;
      
      // Get unique actions
      const uniqueActions = [...new Set(data.map((d) => d.action))];
      return uniqueActions;
    },
    enabled: !!currentTenant?.id,
  });

  // Get unique resources from logs for filter dropdown
  const resourcesQuery = useQuery({
    queryKey: ['activity-log_resources', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('activity_logs')
        .select('resource')
        .order('resource');

      if (error) throw error;
      
      // Get unique resources
      const uniqueResources = [...new Set(data.map((d) => d.resource))];
      return uniqueResources;
    },
    enabled: !!currentTenant?.id,
  });

  return {
    logs: logsQuery.data?.logs || [],
    total: logsQuery.data?.total || 0,
    isLoading: logsQuery.isLoading,
    logActivity,
    uniqueActions: actionsQuery.data || [],
    uniqueResources: resourcesQuery.data || [],
    totalPages: Math.ceil((logsQuery.data?.total || 0) / pageSize),
  };
};

// Standalone function for logging without hook (useful in contexts)
export const logActivityDirect = async (
  tenantId: string,
  userId: string | null,
  action: string,
  resource: string,
  details: Json = {}
) => {
  try {
    await supabase.from('activity_logs').insert([{
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource,
      details,
      ip_address: null,
    }]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

