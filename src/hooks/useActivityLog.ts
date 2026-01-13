import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
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

      const { data, error } = await api.getActivityLogs({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        action: filters?.action,
        resource: filters?.resource,
        start_date: filters?.startDate,
        end_date: filters?.endDate ? `${filters.endDate}T23:59:59.999Z` : undefined,
      });

      if (error) throw new Error(error);
      
      return data as { logs: ActivityLog[], total: number };
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

      const { error } = await api.createActivityLog({
        action,
        resource,
        details,
      });

      if (error) throw new Error(error);
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

      const { data, error } = await api.getActivityLogActions();

      if (error) throw new Error(error);
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Get unique resources from logs for filter dropdown
  const resourcesQuery = useQuery({
    queryKey: ['activity-log_resources', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await api.getActivityLogResources();

      if (error) throw new Error(error);
      return data || [];
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
    await api.createActivityLog({
      action,
      resource,
      resource_id: undefined,
      details,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

