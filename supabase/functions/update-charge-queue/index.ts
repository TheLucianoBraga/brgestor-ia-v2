import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge function to update the charge queue dynamically:
 * 1. Remove pending charge_schedules for customers who have already paid
 * 2. Generate new charge_schedules for upcoming due dates
 * 
 * Scheduled to run:
 * - Every 5 minutes from 7:00 to 11:55 (morning)
 * - Every 1 hour from 12:00 to 18:00 (afternoon)
 * - Every 3 hours from 18:30 to 6:30 (night/dawn)
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[UPDATE-QUEUE] Starting queue update...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let removed = 0;
    let generated = 0;

    // 1. REMOVE PENDING SCHEDULES FOR PAID CUSTOMERS
    // Get all pending charge schedules with their customer_item_id
    const { data: pendingSchedules, error: pendingError } = await supabase
      .from('charge_schedules')
      .select('id, customer_id, customer_item_id, tenant_id')
      .eq('status', 'pending');

    if (pendingError) {
      console.error('[UPDATE-QUEUE] Error fetching pending schedules:', pendingError);
    }

    if (pendingSchedules && pendingSchedules.length > 0) {
      // Get customer_item_ids that are pending
      const customerItemIds = pendingSchedules
        .filter(s => s.customer_item_id)
        .map(s => s.customer_item_id);

      if (customerItemIds.length > 0) {
        // Check which items have been paid (status = 'paid' or 'active' with paid charges)
        const { data: paidItems } = await supabase
          .from('customer_items')
          .select('id, status')
          .in('id', customerItemIds)
          .in('status', ['paid', 'cancelled']);

        const paidItemIds = new Set(paidItems?.map(i => i.id) || []);

        // Also check customer_charges for paid status
        const customerIds = [...new Set(pendingSchedules.map(s => s.customer_id))];
        
        const { data: paidCharges } = await supabase
          .from('customer_charges')
          .select('customer_id')
          .in('customer_id', customerIds)
          .eq('status', 'paid')
          .gte('paid_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        const recentlyPaidCustomerIds = new Set(paidCharges?.map(c => c.customer_id) || []);

        // Remove schedules for paid items or recently paid customers
        for (const schedule of pendingSchedules) {
          const shouldRemove = 
            (schedule.customer_item_id && paidItemIds.has(schedule.customer_item_id)) ||
            recentlyPaidCustomerIds.has(schedule.customer_id);

          if (shouldRemove) {
            const { error: deleteError } = await supabase
              .from('charge_schedules')
              .update({ status: 'cancelled', error_message: 'Cliente pagou - removido automaticamente' })
              .eq('id', schedule.id);

            if (!deleteError) {
              removed++;
              console.log(`[UPDATE-QUEUE] Cancelled schedule ${schedule.id} - customer paid`);
            }
          }
        }
      }
    }

    // 2. GENERATE NEW CHARGE SCHEDULES FOR UPCOMING DUE DATES
    // Get all tenants with charge automation enabled
    const { data: enabledTenants } = await supabase
      .from('tenant_settings')
      .select('tenant_id')
      .eq('key', 'charge_automation_enabled')
      .eq('value', 'true');

    if (enabledTenants && enabledTenants.length > 0) {
      const tenantIds = enabledTenants.map(t => t.tenant_id);

      for (const tenantId of tenantIds) {
        // Get charge automation settings for this tenant
        const { data: settings } = await supabase
          .from('tenant_settings')
          .select('key, value')
          .eq('tenant_id', tenantId)
          .in('key', ['charge_days_before', 'charge_days_after', 'charge_on_due_day', 'charge_template_before', 'charge_template_on', 'charge_template_after']);

        const settingsMap: Record<string, string> = {};
        settings?.forEach(s => {
          settingsMap[s.key] = s.value;
        });

        const daysBefore = settingsMap['charge_days_before'] ? JSON.parse(settingsMap['charge_days_before']) : [3, 1];
        const daysAfter = settingsMap['charge_days_after'] ? JSON.parse(settingsMap['charge_days_after']) : [1, 3, 7];
        const onDueDay = settingsMap['charge_on_due_day'] === 'true';
        const templateBefore = settingsMap['charge_template_before'] || null;
        const templateOn = settingsMap['charge_template_on'] || null;
        const templateAfter = settingsMap['charge_template_after'] || null;

        // Get customer items with upcoming due dates (next 30 days) that are active/pending
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: customerItems } = await supabase
          .from('customer_items')
          .select(`
            id, 
            customer_id, 
            due_date, 
            status,
            customers!inner(tenant_id, status)
          `)
          .eq('customers.tenant_id', tenantId)
          .eq('customers.status', 'active')
          .in('status', ['active', 'pending'])
          .not('due_date', 'is', null)
          .gte('due_date', thirtyDaysAgo.toISOString().split('T')[0])
          .lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0]);

        if (!customerItems || customerItems.length === 0) continue;

        // Get existing schedules for these items to avoid duplicates
        const itemIds = customerItems.map(i => i.id);
        const { data: existingSchedules } = await supabase
          .from('charge_schedules')
          .select('customer_item_id, days_offset, type')
          .in('customer_item_id', itemIds)
          .in('status', ['pending', 'sent']);

        const existingSet = new Set(
          existingSchedules?.map(s => `${s.customer_item_id}-${s.type}-${s.days_offset}`) || []
        );

        // Generate schedules for each customer item
        for (const item of customerItems) {
          if (!item.due_date) continue;

          const dueDate = new Date(item.due_date);
          const now = new Date();

          // Before due date reminders
          for (const days of daysBefore) {
            const scheduledFor = new Date(dueDate);
            scheduledFor.setDate(scheduledFor.getDate() - days);
            scheduledFor.setHours(9, 0, 0, 0); // 9 AM

            const key = `${item.id}-before_due-${-days}`;
            if (!existingSet.has(key) && scheduledFor > now) {
              const { error } = await supabase
                .from('charge_schedules')
                .insert({
                  tenant_id: tenantId,
                  customer_id: item.customer_id,
                  customer_item_id: item.id,
                  template_id: templateBefore,
                  type: 'before_due',
                  days_offset: -days,
                  scheduled_for: scheduledFor.toISOString(),
                  status: 'pending'
                });

              if (!error) generated++;
            }
          }

          // On due date reminder
          if (onDueDay) {
            const scheduledFor = new Date(dueDate);
            scheduledFor.setHours(9, 0, 0, 0);

            const key = `${item.id}-on_due-0`;
            if (!existingSet.has(key) && scheduledFor > now) {
              const { error } = await supabase
                .from('charge_schedules')
                .insert({
                  tenant_id: tenantId,
                  customer_id: item.customer_id,
                  customer_item_id: item.id,
                  template_id: templateOn,
                  type: 'on_due',
                  days_offset: 0,
                  scheduled_for: scheduledFor.toISOString(),
                  status: 'pending'
                });

              if (!error) generated++;
            }
          }

          // After due date reminders
          for (const days of daysAfter) {
            const scheduledFor = new Date(dueDate);
            scheduledFor.setDate(scheduledFor.getDate() + days);
            scheduledFor.setHours(9, 0, 0, 0);

            const key = `${item.id}-after_due-${days}`;
            if (!existingSet.has(key) && scheduledFor > now) {
              const { error } = await supabase
                .from('charge_schedules')
                .insert({
                  tenant_id: tenantId,
                  customer_id: item.customer_id,
                  customer_item_id: item.id,
                  template_id: templateAfter,
                  type: 'after_due',
                  days_offset: days,
                  scheduled_for: scheduledFor.toISOString(),
                  status: 'pending'
                });

              if (!error) generated++;
            }
          }
        }
      }
    }

    console.log(`[UPDATE-QUEUE] Completed: ${removed} removed, ${generated} generated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        removed, 
        generated,
        timestamp: new Date().toISOString()
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[UPDATE-QUEUE] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
