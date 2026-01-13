import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { addDays, setHours, setMinutes, parseISO } from 'date-fns';

interface SettingsMap {
  charge_automation_enabled?: string;
  charge_days_before_due?: string;
  charge_days_after_due?: string;
  charge_send_time?: string;
  charge_template_before_due?: string;
  charge_template_after_due?: string;
  charge_send_on_due_date?: string;
  charge_template_on_due_date?: string;
}

// Helper function to generate charge schedules for a single customer item
export const generateChargeSchedulesForItem = async (
  customerId: string,
  customerItemId: string,
  dueDate: string,
  tenantId: string
) => {
  try {
    // Fetch settings directly from database
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', [
        'charge_automation_enabled',
        'charge_days_before_due',
        'charge_days_after_due',
        'charge_send_time',
        'charge_template_before_due',
        'charge_template_after_due',
        'charge_send_on_due_date',
        'charge_template_on_due_date'
      ]);

    const settingsMap: SettingsMap = {};
    tenantSettings?.forEach((s) => {
      if (s.value) (settingsMap as Record<string, string>)[s.key] = s.value;
    });

    if (settingsMap.charge_automation_enabled !== 'true') {
      console.log('Charge automation disabled, skipping schedule generation');
      return 0;
    }

    let beforeDays: number[] = [3, 1];
    let afterDays: number[] = [1, 3, 7];

    try {
      if (settingsMap.charge_days_before_due) {
        beforeDays = JSON.parse(settingsMap.charge_days_before_due);
      }
      if (settingsMap.charge_days_after_due) {
        afterDays = JSON.parse(settingsMap.charge_days_after_due);
      }
    } catch (e) {
      console.error('Error parsing charge days settings:', e);
    }

    const sendTime = settingsMap.charge_send_time || '09:00';
    const templateBeforeId = settingsMap.charge_template_before_due || null;
    const templateAfterId = settingsMap.charge_template_after_due || null;
    const sendOnDueDate = settingsMap.charge_send_on_due_date === 'true';
    const templateOnDueDateId = settingsMap.charge_template_on_due_date || null;

    const schedules: Array<{
      tenant_id: string;
      customer_id: string;
      customer_item_id: string;
      scheduled_for: string;
      type: string;
      days_offset: number;
      template_id: string | null;
    }> = [];

    const dueDateObj = parseISO(dueDate);
    const [hours, minutes] = sendTime.split(':').map(Number);

    // Generate before due schedules
    for (const days of beforeDays) {
      const scheduledDate = setMinutes(setHours(addDays(dueDateObj, -days), hours), minutes);
      if (scheduledDate > new Date()) {
        schedules.push({
          tenant_id: tenantId,
          customer_id: customerId,
          customer_item_id: customerItemId,
          scheduled_for: scheduledDate.toISOString(),
          type: 'before_due',
          days_offset: -days,
          template_id: templateBeforeId,
        });
      }
    }

    // Generate on due date schedule
    if (sendOnDueDate) {
      const scheduledDate = setMinutes(setHours(dueDateObj, hours), minutes);
      if (scheduledDate > new Date()) {
        schedules.push({
          tenant_id: tenantId,
          customer_id: customerId,
          customer_item_id: customerItemId,
          scheduled_for: scheduledDate.toISOString(),
          type: 'on_due',
          days_offset: 0,
          template_id: templateOnDueDateId,
        });
      }
    }

    // Generate after due schedules
    for (const days of afterDays) {
      const scheduledDate = setMinutes(setHours(addDays(dueDateObj, days), hours), minutes);
      schedules.push({
        tenant_id: tenantId,
        customer_id: customerId,
        customer_item_id: customerItemId,
        scheduled_for: scheduledDate.toISOString(),
        type: 'after_due',
        days_offset: days,
        template_id: templateAfterId,
      });
    }

    if (schedules.length > 0) {
      const { error } = await supabase
        .from('charge_schedules')
        .insert(schedules);

      if (error) {
        console.error('Error creating charge schedules:', error);
        return 0;
      }
    }

    return schedules.length;
  } catch (error) {
    console.error('Error generating charge schedules:', error);
    return 0;
  }
};

export const useChargeScheduleGenerator = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Query to count pending schedules
  const pendingSchedulesQuery = useQuery({
    queryKey: ['pending-charge-schedules_count', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return 0;

      const { count, error } = await supabase
        .from('charge_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentTenant?.id,
  });

  // Mutation to regenerate all schedules for existing customer items
  const regenerateAllSchedules = useMutation({
    mutationFn: async () => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      // Fetch all customer_items with due_date for this tenant
      const { data: items, error: itemsError } = await supabase
        .from('customer_items')
        .select(`
          id, 
          customer_id, 
          due_date,
          customers!inner(tenant_id)
        `)
        .not('due_date', 'is', null);

      if (itemsError) throw itemsError;

      // Filter items by tenant
      const tenantItems = (items || []).filter(
        (item: any) => item.customers?.tenant_id === currentTenant.id
      );

      if (tenantItems.length === 0) {
        return { deleted: 0, created: 0 };
      }

      // Delete all pending schedules for this tenant
      const { data: deleted } = await supabase
        .from('charge_schedules')
        .delete()
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'pending')
        .select('id');

      // Create new schedules for each item
      let created = 0;
      for (const item of tenantItems) {
        if (item.due_date) {
          const count = await generateChargeSchedulesForItem(
            item.customer_id,
            item.id,
            item.due_date,
            currentTenant.id
          );
          created += count;
        }
      }

      return { deleted: deleted?.length || 0, created };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-charge-schedules_count'] });
      toast.success(`Agendamentos regenerados: ${result.created} criados, ${result.deleted} removidos`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao regenerar agendamentos');
    },
  });

  // Mutation to test scheduled charges processing
  const testScheduledCharges = useMutation({
    mutationFn: async () => {
      const response = await supabase.rpc('process_scheduled_charges');
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(`Processado: ${result.processed} mensagens, ${result.errors} erros`);
      } else {
        toast.error(result?.error || 'Erro ao processar cobranças');
      }
      queryClient.invalidateQueries({ queryKey: ['pending-charge-schedules_count'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao testar cobranças agendadas');
    },
  });

  return {
    pendingCount: pendingSchedulesQuery.data || 0,
    isLoadingCount: pendingSchedulesQuery.isLoading,
    regenerateAllSchedules,
    testScheduledCharges,
  };
};

