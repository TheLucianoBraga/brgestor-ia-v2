import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createQRCode } from "../_shared/waha-simple.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const { method } = req;

    // Endpoint público para status
    if (url.pathname === '/whatsapp/status' || url.pathname === '/status') {
      const statusResult = await getProviderStatus();
      
      return new Response(JSON.stringify({
        ...statusResult,
        currentProvider: Deno.env.get('CURRENT_PROVIDER') || 'waha',
        vpsIp: Deno.env.get('VPS_IP') || '72.60.14.172',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

        console.log('=== WAHA SIMPLES - CRIAR QR ===');
        console.log('UserID:', userId);
        
        const result = await createQRCode(userId);
        console.log('Resultado final:', JSON.stringify(result, null, 2));
        
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
        
        // Log da mensagem
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
          })
          .then(() => {}, (error) => console.log('Log insert failed (table may not exist):', error.message));

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        });
      }

      case '/whatsapp/get-qr': {
        if (method !== 'POST') {
          return new Response('Method not allowed', { 
            status: 405, 
            headers: corsHeaders 
          });
        }

        const { sessionName, userId } = await req.json();
        const finalUserId = userId || sessionName;
        
        if (!finalUserId) {
          return new Response(
            JSON.stringify({ error: 'sessionName or userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('=== ENDPOINT GET-QR - USANDO WAHA-SIMPLE ===');
        console.log('UserID:', finalUserId);
        
        const result = await createQRCode(finalUserId);
        console.log('Resultado QR:', JSON.stringify(result, null, 2));
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        });
      }

      case '/whatsapp/sessions': {
        if (method !== 'GET') {
          return new Response('Method not allowed', { 
            status: 405, 
            headers: corsHeaders 
          });
        }

        try {
          const wahaBaseUrl = `http://${Deno.env.get('VPS_IP') || '72.60.14.172'}:3000`;
          const wahaApiKey = Deno.env.get('WAHA_API_KEY');
          
          const sessionsResponse = await fetch(`${wahaBaseUrl}/api/sessions`, {
            method: 'GET',
            headers: {
              'X-Api-Key': wahaApiKey,
            },
          });

          if (sessionsResponse.ok) {
            const sessions = await sessionsResponse.json();
            return new Response(JSON.stringify({
              success: true,
              sessions: sessions,
              provider: 'waha',
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: 'Failed to fetch sessions'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: sessionsResponse.status
            });
          }
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      }

      case '/whatsapp/status': {
        // Já tratado acima como endpoint público
        break;
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
              'POST /whatsapp/get-qr',
              'GET /whatsapp/sessions',
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