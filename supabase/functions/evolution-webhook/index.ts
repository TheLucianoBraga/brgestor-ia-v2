import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// EVOLUTION API WEBHOOK
// Converte payload Evolution para formato compatível com WAHA
// e redireciona para waha-webhook-v3
// ========================================

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📥 [Evolution Webhook] Payload recebido:', JSON.stringify(body).substring(0, 500));

    // Evolution API envia eventos em formato diferente do WAHA
    // Vamos converter para o formato que o waha-webhook-v3 espera

    // Identificar tipo de evento Evolution
    const event = body.event || body.type;
    
    // Se não for mensagem, ignorar
    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      console.log('⏭️ [Evolution Webhook] Evento ignorado:', event);
      return new Response(JSON.stringify({ status: 'ignored', event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair dados da mensagem Evolution
    const data = body.data || body;
    const messageData = data.message || data;
    
    // Verificar se é mensagem de saída (fromMe)
    const key = messageData.key || data.key || {};
    if (key.fromMe === true) {
      console.log('⏭️ [Evolution Webhook] Mensagem própria, ignorando');
      return new Response(JSON.stringify({ status: 'ignored', reason: 'fromMe' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair informações do remetente
    const remoteJid = key.remoteJid || data.remoteJid || '';
    const pushName = messageData.pushName || data.pushName || '';
    const instanceName = body.instance || body.instanceName || data.instance || '';
    
    // Extrair texto da mensagem
    let messageText = '';
    const msg = messageData.message || messageData;
    
    if (msg.conversation) {
      messageText = msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      messageText = msg.extendedTextMessage.text;
    } else if (msg.imageMessage?.caption) {
      messageText = msg.imageMessage.caption;
    } else if (msg.videoMessage?.caption) {
      messageText = msg.videoMessage.caption;
    } else if (msg.documentMessage?.caption) {
      messageText = msg.documentMessage.caption;
    }

    // Se não tiver texto, ignorar
    if (!messageText) {
      console.log('⏭️ [Evolution Webhook] Mensagem sem texto');
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no_text' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📩 [Evolution Webhook] Mensagem de ${remoteJid}: ${messageText.substring(0, 100)}`);

    // Converter para formato WAHA
    const wahaPayload = {
      event: 'message',
      session: instanceName,
      engine: 'EVOLUTION', // Marcar origem
      payload: {
        id: key.id || `evo_${Date.now()}`,
        timestamp: messageData.messageTimestamp || Math.floor(Date.now() / 1000),
        from: remoteJid,
        fromMe: false,
        to: instanceName,
        body: messageText,
        hasMedia: !!(msg.imageMessage || msg.videoMessage || msg.audioMessage || msg.documentMessage),
        type: 'chat',
        _data: {
          notifyName: pushName,
          from: remoteJid,
        }
      }
    };

    console.log('🔄 [Evolution Webhook] Convertido para formato WAHA:', JSON.stringify(wahaPayload).substring(0, 300));

    // Chamar waha-webhook-v3 diretamente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const wahaWebhookUrl = `${supabaseUrl}/functions/v1/waha-webhook-v3`;
    
    const wahaResponse = await fetch(wahaWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(wahaPayload),
    });

    const wahaResult = await wahaResponse.json();
    console.log('✅ [Evolution Webhook] Resposta do waha-webhook-v3:', JSON.stringify(wahaResult).substring(0, 200));

    return new Response(JSON.stringify({
      status: 'processed',
      source: 'evolution',
      converted: true,
      result: wahaResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [Evolution Webhook] Erro:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      source: 'evolution-webhook'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
