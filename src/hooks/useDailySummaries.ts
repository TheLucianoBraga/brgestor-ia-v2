import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';

export interface DailySummary {
  id: string;
  tenant_id: string;
  summary_date: string;
  summary_content: string;
  metrics: {
    payments_received?: number;
    total_revenue?: number;
    new_customers?: number;
    new_resellers?: number;
    charges_created?: number;
    charges_paid?: number;
  };
  ai_insights: string[];
  sent_at: string | null;
  sent_channels: string[];
  created_at: string;
}

export const useDailySummaries = (limit = 7) => {
  const { currentTenant } = useTenant();

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ['daily_summaries', currentTenant?.id, limit],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('daily_summaries' as any)
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('summary_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as DailySummary[];
    },
    enabled: !!currentTenant?.id,
  });

  const { data: todaySummary } = useQuery({
    queryKey: ['daily-summary_today', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_summaries' as any)
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('summary_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as DailySummary | null;
    },
    enabled: !!currentTenant?.id,
  });

  return {
    summaries,
    todaySummary,
    isLoading,
  };
};

