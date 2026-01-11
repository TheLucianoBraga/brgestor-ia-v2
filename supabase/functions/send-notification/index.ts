import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  notification_id?: string;
  tenant_id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
  priority?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: NotificationRequest = await req.json();
    const { tenant_id, user_id, title, message, type, channels = ['in_app'], metadata = {}, priority = 'normal' } = body;

    console.log('Processing notification:', { tenant_id, type, channels });

    // Buscar preferências do usuário/tenant
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    // Buscar configurações do tenant (para WhatsApp)
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenant_id)
      .in('key', ['notification_whatsapp', 'whatsapp_session_id', 'waha_api_url']);

    const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
    const whatsappNumber = settingsMap['notification_whatsapp'];
    const wahaSessionId = settingsMap['whatsapp_session_id'];
    const wahaApiUrl = settingsMap['waha_api_url'] || Deno.env.get('WAHA_API_URL');

    const sentChannels: string[] = [];
    const deliveryLogs: Array<{ channel: string; status: string; error_message?: string }> = [];

    // Processar cada canal
    for (const channel of channels) {
      // Verificar preferências
      const prefKey = `${channel}_enabled`;
      if (preferences && preferences[prefKey] === false) {
        console.log(`Channel ${channel} disabled by preferences`);
        continue;
      }

      try {
        switch (channel) {
          case 'in_app':
            // Já criado pelo trigger, apenas marcar como enviado
            sentChannels.push('in_app');
            deliveryLogs.push({ channel: 'in_app', status: 'delivered' });
            break;

          case 'whatsapp':
            if (whatsappNumber && wahaSessionId && wahaApiUrl) {
              const waResponse = await fetch(`${wahaApiUrl}/api/sendText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session: wahaSessionId,
                  chatId: `${whatsappNumber.replace(/\D/g, '')}@c.us`,
                  text: `*${title}*\n\n${message}`,
                }),
              });

              if (waResponse.ok) {
                sentChannels.push('whatsapp');
                deliveryLogs.push({ channel: 'whatsapp', status: 'sent' });
                console.log('WhatsApp notification sent');
              } else {
                const error = await waResponse.text();
                deliveryLogs.push({ channel: 'whatsapp', status: 'failed', error_message: error });
                console.error('WhatsApp send failed:', error);
              }
            } else {
              console.log('WhatsApp not configured');
              deliveryLogs.push({ channel: 'whatsapp', status: 'failed', error_message: 'Not configured' });
            }
            break;

          case 'email':
            // TODO: Implementar envio de email via SMTP
            console.log('Email notifications not yet implemented');
            deliveryLogs.push({ channel: 'email', status: 'pending', error_message: 'Not implemented' });
            break;

          case 'push':
            // Buscar push subscriptions do usuário
            if (user_id) {
              const { data: subscriptions } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', user_id)
                .eq('is_active', true);

              if (subscriptions && subscriptions.length > 0) {
                // TODO: Implementar Web Push
                console.log(`Found ${subscriptions.length} push subscriptions`);
                deliveryLogs.push({ channel: 'push', status: 'pending', error_message: 'Web Push not implemented' });
              }
            }
            break;
        }
      } catch (error) {
        console.error(`Error sending to ${channel}:`, error);
        deliveryLogs.push({ channel, status: 'failed', error_message: String(error) });
      }
    }

    // Atualizar notification com canais enviados
    if (body.notification_id && sentChannels.length > 0) {
      await supabase
        .from('notifications')
        .update({ channels_sent: sentChannels })
        .eq('id', body.notification_id);
    }

    // Registrar logs de entrega
    if (body.notification_id && deliveryLogs.length > 0) {
      await supabase.from('notification_delivery_log').insert(
        deliveryLogs.map(log => ({
          notification_id: body.notification_id,
          ...log,
          sent_at: log.status === 'sent' || log.status === 'delivered' ? new Date().toISOString() : null,
        }))
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        channels_sent: sentChannels,
        delivery_logs: deliveryLogs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
