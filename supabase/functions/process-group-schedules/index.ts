import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GroupSchedule {
  id: string;
  tenant_id: string;
  group_id: string;
  waha_group_id: string;
  message: string;
  image_urls?: string[];
  scheduled_at: string;
  recurrence: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[CRON] Starting process-group-schedules');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // 1. BUSCAR AGENDAMENTOS PENDENTES
    const { data: schedules, error: fetchError } = await supabase
      .from('group_message_schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (fetchError) throw fetchError;

    console.log(`[CRON] Found ${schedules?.length || 0} group schedules to process`);

    let processed = 0;
    let errors = 0;

    if (schedules) {
      for (const schedule of schedules as GroupSchedule[]) {
        try {
          // Buscar configurações do WAHA para o tenant
          const { data: settings } = await supabase
            .from('tenant_settings')
            .select('key, value')
            .eq('tenant_id', schedule.tenant_id)
            .in('key', ['waha_api_url', 'waha_api_key', 'company_name']);
          
          const settingsMap: Record<string, string> = {};
          settings?.forEach((s) => {
            settingsMap[s.key] = s.value;
          });

          const wahaUrl = settingsMap['waha_api_url'];
          const wahaKey = settingsMap['waha_api_key'];

          if (!wahaUrl || !wahaKey) {
            await supabase.from('group_message_schedules').update({ 
              status: 'failed', 
              error_message: 'WAHA não configurado' 
            }).eq('id', schedule.id);
            errors++;
            continue;
          }

          // Buscar dados do grupo para variáveis
          const { data: group } = await supabase
            .from('whatsapp_groups')
            .select('name')
            .eq('id', schedule.group_id)
            .single();

          // Processar variáveis na mensagem
          let finalMessage = schedule.message;
          const replaceVar = (text: string, key: string, value: string) => {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            return text.replace(regex, value);
          };

          const nowObj = new Date();
          finalMessage = replaceVar(finalMessage, 'nome_grupo', group?.name || '');
          finalMessage = replaceVar(finalMessage, 'data_atual', nowObj.toLocaleDateString('pt-BR'));
          finalMessage = replaceVar(finalMessage, 'hora_atual', nowObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
          finalMessage = replaceVar(finalMessage, 'link_portal', 'https://brgestor-ai.vercel.app');
          finalMessage = replaceVar(finalMessage, 'empresa', settingsMap['company_name'] || 'BRGestor');

          const images = schedule.image_urls || [];
          let success = true;
          let lastResponse: globalThis.Response | null = null;

          if (images.length === 1) {
            // Caso 1: Apenas 1 imagem -> Texto vai na legenda
            lastResponse = await fetch(`${wahaUrl}/api/sendImage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${wahaKey}`,
              },
              body: JSON.stringify({
                chatId: schedule.waha_group_id,
                file: { url: images[0] },
                caption: finalMessage,
                session: 'default',
              }),
            });
            success = lastResponse.ok;
          } else if (images.length > 1) {
            // Caso 2: Mais de 1 imagem -> Imagens primeiro, depois o texto
            for (const imageUrl of images) {
              await fetch(`${wahaUrl}/api/sendImage`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${wahaKey}`,
                },
                body: JSON.stringify({
                  chatId: schedule.waha_group_id,
                  file: { url: imageUrl },
                  session: 'default',
                }),
              });
            }
            lastResponse = await fetch(`${wahaUrl}/api/sendText`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${wahaKey}`,
              },
              body: JSON.stringify({
                chatId: schedule.waha_group_id,
                text: finalMessage,
                session: 'default',
              }),
            });
            success = lastResponse.ok;
          } else {
            // Caso 3: Sem imagens -> Apenas texto
            lastResponse = await fetch(`${wahaUrl}/api/sendText`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${wahaKey}`,
              },
              body: JSON.stringify({
                chatId: schedule.waha_group_id,
                text: finalMessage,
                session: 'default',
              }),
            });
            success = lastResponse.ok;
          }

          if (success) {
            // Se for recorrente, agendar a próxima
            if (schedule.recurrence !== 'once') {
              let nextDate = new Date(schedule.scheduled_at);
              if (schedule.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
              else if (schedule.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
              else if (schedule.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

              await supabase.from('group_message_schedules').update({
                scheduled_at: nextDate.toISOString(),
                last_sent_at: now
              }).eq('id', schedule.id);
            } else {
              await supabase.from('group_message_schedules').update({ 
                status: 'sent', 
                sent_at: now 
              }).eq('id', schedule.id);
            }
            processed++;
          } else if (lastResponse) {
            const errorText = await lastResponse.text();
            await supabase.from('group_message_schedules').update({ 
              status: 'failed', 
              error_message: `Erro WAHA: ${lastResponse.status} - ${errorText}` 
            }).eq('id', schedule.id);
            errors++;
          } else {
            await supabase.from('group_message_schedules').update({ 
              status: 'failed', 
              error_message: 'Erro desconhecido ao enviar mensagem' 
            }).eq('id', schedule.id);
            errors++;
          }
        } catch (err) {
          errors++;
          console.error(`Error processing group schedule ${schedule.id}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed, errors }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
