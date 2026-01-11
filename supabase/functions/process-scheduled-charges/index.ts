import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChargeSchedule {
  id: string;
  tenant_id: string;
  customer_id: string;
  template_id: string | null;
  type: string;
  days_offset: number;
  customer_item_id?: string;
}

interface ScheduledMessage {
  id: string;
  tenant_id: string;
  customer_id: string;
  template_id: string | null;
  custom_content: string | null;
  scheduled_at: string;
}

interface Customer {
  full_name: string;
  whatsapp: string;
  email: string;
}

interface TenantSettings {
  key: string;
  value: string;
}

interface CustomerItem {
  product_name: string;
  price: number;
  due_date: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[CRON] Starting process-scheduled-tasks');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // 1. PROCESS CHARGE SCHEDULES
    const { data: chargeSchedules, error: chargeError } = await supabase
      .from('charge_schedules')
      .select(`id, tenant_id, customer_id, customer_item_id, template_id, type, days_offset`)
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (chargeError) console.error('[CRON] Error fetching charge schedules:', chargeError);

    // 2. PROCESS SCHEDULED MESSAGES
    const { data: scheduledMessages, error: messageError } = await supabase
      .from('scheduled_messages')
      .select(`id, tenant_id, customer_id, template_id, custom_content, scheduled_at`)
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (messageError) console.error('[CRON] Error fetching scheduled messages:', messageError);

    console.log(`[CRON] Found ${chargeSchedules?.length || 0} charge schedules and ${scheduledMessages?.length || 0} scheduled messages`);

    let processed = 0;
    let errors = 0;

    // Helper to get WAHA settings
    const getWahaSettings = async (tenantId: string) => {
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('key, value')
        .eq('tenant_id', tenantId)
        .in('key', ['waha_api_url', 'waha_api_key', 'charge_automation_enabled']);
      
      const settingsMap: Record<string, string> = {};
      (settings as TenantSettings[] | null)?.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      return settingsMap;
    };

    // Helper to send WAHA message
    const sendWahaMessage = async (wahaUrl: string, wahaKey: string, phone: string, text: string) => {
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      
      return await fetch(`${wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wahaKey}`,
        },
        body: JSON.stringify({
          chatId: `${formattedPhone}@c.us`,
          text: text,
          session: 'default',
        }),
      });
    };

    // PROCESS CHARGE SCHEDULES
    if (chargeSchedules) {
      for (const schedule of chargeSchedules) {
        try {
          const settings = await getWahaSettings(schedule.tenant_id);
          if (settings['charge_automation_enabled'] !== 'true') continue;

          const wahaUrl = settings['waha_api_url'];
          const wahaKey = settings['waha_api_key'];

          if (!wahaUrl || !wahaKey) {
            await supabase.from('charge_schedules').update({ status: 'failed', error_message: 'WAHA não configurado' }).eq('id', schedule.id);
            errors++;
            continue;
          }

          const { data: customer } = await supabase.from('customers').select('full_name, whatsapp, email').eq('id', schedule.customer_id).single();
          if (!customer) {
            await supabase.from('charge_schedules').update({ status: 'failed', error_message: 'Cliente não encontrado' }).eq('id', schedule.id);
            errors++;
            continue;
          }

          let customerItem: CustomerItem | null = null;
          if (schedule.customer_item_id) {
            const { data } = await supabase.from('customer_items').select('product_name, price, due_date').eq('id', schedule.customer_item_id).single();
            customerItem = data;
          }

          let messageContent = '';
          if (schedule.template_id) {
            const { data: template } = await supabase.from('message_templates').select('content').eq('id', schedule.template_id).single();
            if (template) messageContent = template.content;
          }

          if (!messageContent) {
            if (schedule.type === 'before_due') {
              messageContent = `Olá {{nome}}! 👋\n\nLembramos que sua fatura vence em ${Math.abs(schedule.days_offset)} dia(s).\n\nValor: {{valor}}\nVencimento: {{vencimento}}\n\nQualquer dúvida, estamos à disposição!`;
            } else if (schedule.type === 'on_due') {
              messageContent = `Olá {{nome}}! 👋\n\nSua fatura vence hoje!\n\nValor: {{valor}}\nVencimento: {{vencimento}}\n\nQualquer dúvida, estamos à disposição!`;
            } else {
              messageContent = `Olá {{nome}}! 👋\n\nSua fatura está vencida há ${schedule.days_offset} dia(s).\n\nValor: {{valor}}\nVencimento: {{vencimento}}\n\nPor favor, regularize sua situação.`;
            }
          }

          const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
          const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

          // Helper to replace both {{var}} and {var}
          const replaceVar = (text: string, key: string, value: string) => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(\\{\\{${escapedKey}\\}\\}|\\{${escapedKey}\\})`, 'g');
            return text.replace(regex, value);
          };

          const baseUrl = 'https://brgestor-ai.vercel.app'; // Base URL do sistema
          const paymentLink = `${baseUrl}/fatura?c=${schedule.customer_id.slice(0, 8)}&t=${schedule.tenant_id.slice(0, 8)}`;

          messageContent = replaceVar(messageContent, 'nome', customer.full_name);
          messageContent = replaceVar(messageContent, 'primeiro_nome', customer.full_name.split(' ')[0]);
          messageContent = replaceVar(messageContent, 'valor', customerItem ? formatCurrency(customerItem.price || 0) : '');
          messageContent = replaceVar(messageContent, 'vencimento', customerItem?.due_date ? formatDate(customerItem.due_date) : '');
          messageContent = replaceVar(messageContent, 'produto', customerItem?.product_name || '');
          messageContent = replaceVar(messageContent, 'whatsapp', customer.whatsapp || '');
          messageContent = replaceVar(messageContent, 'email', customer.email || '');
          messageContent = replaceVar(messageContent, 'link_pagamento', paymentLink);
          messageContent = replaceVar(messageContent, 'empresa', settings['company_name'] || 'BRGestor');

          const response = await sendWahaMessage(wahaUrl, wahaKey, customer.whatsapp, messageContent);

          if (response.ok) {
            await supabase.from('charge_schedules').update({ status: 'sent', sent_at: now }).eq('id', schedule.id);
            await supabase.from('message_logs').insert({ tenant_id: schedule.tenant_id, customer_id: schedule.customer_id, template_id: schedule.template_id, channel: 'whatsapp', status: 'sent', sent_at: now });
            processed++;
          } else {
            const errorText = await response.text();
            await supabase.from('charge_schedules').update({ status: 'failed', error_message: `Erro WAHA: ${response.status} - ${errorText}` }).eq('id', schedule.id);
            errors++;
          }
        } catch (err) {
          errors++;
          console.error(`Error processing charge schedule ${schedule.id}:`, err);
        }
      }
    }

    // PROCESS SCHEDULED MESSAGES
    if (scheduledMessages) {
      for (const msg of scheduledMessages) {
        try {
          const settings = await getWahaSettings(msg.tenant_id);
          const wahaUrl = settings['waha_api_url'];
          const wahaKey = settings['waha_api_key'];

          if (!wahaUrl || !wahaKey) {
            await supabase.from('scheduled_messages').update({ status: 'failed', error_message: 'WAHA não configurado' }).eq('id', msg.id);
            errors++;
            continue;
          }

          const { data: customer } = await supabase.from('customers').select('full_name, whatsapp, email').eq('id', msg.customer_id).single();
          if (!customer) {
            await supabase.from('scheduled_messages').update({ status: 'failed', error_message: 'Cliente não encontrado' }).eq('id', msg.id);
            errors++;
            continue;
          }

          let content = msg.custom_content;
          if (!content && msg.template_id) {
            const { data: template } = await supabase.from('message_templates').select('content').eq('id', msg.template_id).single();
            if (template) content = template.content;
          }

          if (!content) {
            await supabase.from('scheduled_messages').update({ status: 'failed', error_message: 'Conteúdo da mensagem vazio' }).eq('id', msg.id);
            errors++;
            continue;
          }

          // Helper to replace both {{var}} and {var}
          const replaceVar = (text: string, key: string, value: string) => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(\\{\\{${escapedKey}\\}\\}|\\{${escapedKey}\\})`, 'g');
            return text.replace(regex, value);
          };

          content = replaceVar(content, 'nome', customer.full_name);
          content = replaceVar(content, 'primeiro_nome', customer.full_name.split(' ')[0]);
          content = replaceVar(content, 'whatsapp', customer.whatsapp || '');
          content = replaceVar(content, 'email', customer.email || '');
          content = replaceVar(content, 'empresa', settings['company_name'] || 'BRGestor');

          const response = await sendWahaMessage(wahaUrl, wahaKey, customer.whatsapp, content);

          if (response.ok) {
            await supabase.from('scheduled_messages').update({ status: 'sent', sent_at: now }).eq('id', msg.id);
            await supabase.from('message_logs').insert({ tenant_id: msg.tenant_id, customer_id: msg.customer_id, template_id: msg.template_id, channel: 'whatsapp', status: 'sent', sent_at: now });
            processed++;
          } else {
            const errorText = await response.text();
            await supabase.from('scheduled_messages').update({ status: 'failed', error_message: `Erro WAHA: ${response.status} - ${errorText}` }).eq('id', msg.id);
            errors++;
          }
        } catch (err) {
          errors++;
          console.error(`Error processing scheduled message ${msg.id}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed, errors }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
