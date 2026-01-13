// ⚠️  ARQUIVO HISTÓRICO - NÃO USAR ⚠️ 
// Este arquivo é da época do Supabase Edge Functions
// Foi substituído por whatsapp-local-service.js no VPS
// Mantido apenas para referência histórica

// CÓDIGO OBSOLETO ABAIXO:

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Importar o adapter (assumindo que está no mesmo diretório ou em _shared)
import { createInstance, sendMessage, getProviderStatus } from "../_shared/whatsapp-adapter.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const { method } = req;

    // Verificar autenticação (opcional)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client para logs (opcional)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (url.pathname) {
      case '/whatsapp/create-instance': {
        if (method !== 'POST') {
          return new Response('Method not allowed', { 
            status: 405, 
            headers: corsHeaders 
          });
        }

        const { userId } = await req.json();
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await createInstance(userId);
        
        // Log da operação (opcional)
        await supabase
          .from('whatsapp_instances_log')
          .insert({
            user_id: userId,
            action: 'create_instance',
            provider: result.provider,
            success: result.success,
            error: result.error || null,
            created_at: new Date().toISOString()
          });

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        });
      }

      case '/whatsapp/send-message': {
        if (method !== 'POST') {
          return new Response('Method not allowed', { 
            status: 405, 
            headers: corsHeaders 
          });
        }

        const { phone, text, userId } = await req.json();
        if (!phone || !text) {
          return new Response(
            JSON.stringify({ error: 'phone and text are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await sendMessage(phone, text);
        
        // Log da mensagem (opcional)
        await supabase
          .from('whatsapp_messages_log')
          .insert({
            user_id: userId || 'unknown',
            phone: phone,
            text_preview: text.substring(0, 50),
            provider: result.provider,
            success: result.success,
            message_id: result.messageId || null,
            error: result.error || null,
            created_at: new Date().toISOString()
          });

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        });
      }

      case '/whatsapp/status': {
        if (method !== 'GET') {
          return new Response('Method not allowed', { 
            status: 405, 
            headers: corsHeaders 
          });
        }

        const statusResult = await getProviderStatus();
        
        return new Response(JSON.stringify({
          ...statusResult,
          currentProvider: Deno.env.get('CURRENT_PROVIDER') || 'waha',
          vpsIp: Deno.env.get('VPS_IP') || '72.60.14.172'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case '/whatsapp/switch-provider': {
        if (method !== 'POST') {
          return new Response('Method not allowed', { 
            status: 405, 
            headers: corsHeaders 
          });
        }

        const { provider } = await req.json();
        if (!provider || !['evolution', 'waha'].includes(provider.toLowerCase())) {
          return new Response(
            JSON.stringify({ error: 'Invalid provider. Use "evolution" or "waha"' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Atualizar variável de ambiente no Supabase (necessário configurar)
        // Nota: Em produção, isso pode ser feito via dashboard do Supabase
        // ou através de uma Edge Function específica para admin
        
        return new Response(JSON.stringify({
          message: `Provider switch to ${provider} requested`,
          note: 'Update CURRENT_PROVIDER environment variable in Supabase dashboard',
          currentProvider: Deno.env.get('CURRENT_PROVIDER') || 'waha'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Endpoint not found',
            availableEndpoints: [
              'POST /whatsapp/create-instance',
              'POST /whatsapp/send-message', 
              'GET /whatsapp/status',
              'POST /whatsapp/switch-provider'
            ]
          }), 
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('WhatsApp Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/* 
CONFIGURAÇÃO SUPABASE:

1. Criar tabelas para logs (opcional):

CREATE TABLE whatsapp_instances_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  provider TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whatsapp_messages_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  text_preview TEXT,
  provider TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

2. Variáveis de ambiente no Supabase:
   - CURRENT_PROVIDER=waha (ou evolution)
   - VPS_IP=72.60.14.172
   - WAHA_API_KEY=waha_api_key_2026
   - EVOLUTION_API_KEY=evolution_api_key_2026

3. Deploy:
   supabase functions deploy whatsapp

4. Uso no frontend:
   const { data, error } = await supabase.functions.invoke('whatsapp', {
     body: { 
       action: 'send-message',
       phone: '5511999999999',
       text: 'Olá!',
       userId: 'user123'
     }
   });
*/