import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log('1. Verificando variáveis de ambiente...');
    console.log('SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'FALTANDO');
    console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'OK' : 'FALTANDO');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'FALTANDO');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Variáveis de ambiente faltando!');
      return json({ success: false, error: "Supabase não configurado" }, 500);
    }

    console.log('2. Verificando autorização...');
    const authHeader = req.headers.get("Authorization");
    console.log('Auth header:', authHeader ? 'Presente' : 'Ausente');

    // O Supabase passa o token nos metadados internos, não no header HTTP
    // Então vamos criar o client que automaticamente usa o contexto da requisição
    console.log('3. Validando usuário...');
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { 
        headers: authHeader ? { Authorization: authHeader } : {}
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError) {
      console.error('❌ Erro ao validar usuário:', authError.message);
      return json({ success: false, error: `Erro de autenticação: ${authError.message}` }, 401);
    }

    if (!user) {
      console.error('❌ Usuário não encontrado!');
      return json({ success: false, error: "Sessão inválida ou expirada" }, 401);
    }

    console.log('✅ Usuário validado:', user.id);

    console.log('✅ Usuário validado:', user.id);

    console.log('4. Conectando ao Supabase Admin...');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar tenant do usuário
    console.log('5. Buscando tenant do usuário...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('current_tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Erro ao buscar profile:', profileError.message);
      return json({ success: false, error: `Erro ao buscar perfil: ${profileError.message}` }, 500);
    }

    if (!profile?.current_tenant_id) {
      console.error('❌ Tenant não selecionado!');
      return json({ success: false, error: "Tenant não selecionado. Selecione uma empresa." }, 400);
    }

    const tenantId = profile.current_tenant_id;
    console.log('✅ Tenant encontrado:', tenantId);

    // Buscar credenciais WAHA das configurações do tenant
    console.log('6. Buscando configurações WAHA...');
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['waha_api_url', 'waha_api_key']);

    if (settingsError) {
      console.error('❌ Erro ao buscar settings:', settingsError.message);
      return json({ success: false, error: `Erro ao buscar configurações: ${settingsError.message}` }, 500);
    }

    const cfg: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => cfg[s.key] = s.value);

    let WAHA_API_URL = (cfg['waha_api_url'] || '').trim();
    let WAHA_API_KEY = (cfg['waha_api_key'] || '').trim();

    console.log('=== CONFIGURAÇÕES ENCONTRADAS ===');
    console.log('WAHA URL configurado:', WAHA_API_URL || 'VAZIO');
    console.log('WAHA Key configurado:', WAHA_API_KEY ? 'Sim (oculto)' : 'VAZIO');

    if (!WAHA_API_URL || !WAHA_API_KEY) {
      console.error('❌ WAHA não configurado!');
      return json({ 
        success: false, 
        error: "WAHA não configurado. Vá em Configurações → Integrações e configure a URL e API Key do WAHA." 
      }, 400);
    }

    // Normalizar URL
    WAHA_API_URL = WAHA_API_URL.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(WAHA_API_URL)) {
      WAHA_API_URL = `http://${WAHA_API_URL}`;
    }

    console.log('API URL final:', WAHA_API_URL);

    const sessionName = `tenant_${tenantId.substring(0, 8)}`;

    console.log('Session name:', sessionName);
    console.log('Criando sessão no WAHA...');

    const createResponse = await fetch(`${WAHA_API_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": WAHA_API_KEY,
      },
      body: JSON.stringify({
        name: sessionName,
        start: true,
        config: { proxy: null, webhooks: [] },
      }),
    });

    console.log('Create response status:', createResponse.status);

    if (createResponse.status === 422 || createResponse.status === 409) {
      console.log('Sessão já existe, tentando iniciar...');
      await fetch(`${WAHA_API_URL}/api/sessions/${sessionName}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WAHA_API_KEY,
        },
      });
    }

    let qrCode: string | null = null;
    let isConnected = false;
    let sessionStatus = "STARTING";

    for (let attempt = 0; attempt < 10; attempt++) {
      await sleep(1000);
      console.log(`Tentativa ${attempt + 1}/10`);

      try {
        const statusResponse = await fetch(`${WAHA_API_URL}/api/sessions/${sessionName}`, {
          method: "GET",
          headers: { "X-Api-Key": WAHA_API_KEY },
        });

        if (!statusResponse.ok) {
          console.log('Status check failed:', statusResponse.status);
          continue;
        }

        const statusData = await statusResponse.json();
        sessionStatus = statusData.status;
        console.log(`Status da sessão: ${sessionStatus}`);

        if (sessionStatus === "WORKING" || sessionStatus === "CONNECTED") {
          isConnected = true;
          console.log('✅ Sessão já conectada!');
          break;
        }

        if (sessionStatus === "SCAN_QR_CODE") {
          console.log('🔍 Buscando QR Code...');
          const qr = await fetchQRCode(WAHA_API_URL, WAHA_API_KEY, sessionName);
          if (qr) {
            qrCode = qr;
            console.log('✅ QR Code encontrado!');
            break;
          }
        }
      } catch (error) {
        console.error("Status check failed:", error);
      }
    }

    await supabaseAdmin
      .from("user_whatsapp_instances")
      .upsert(
        {
          user_id: user.id,
          instance_name: sessionName,
          instance_status: isConnected ? "connected" : "waiting_qr",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .then(() => {}, (dbError) => console.error("user_whatsapp_instances upsert failed:", dbError));

    return json({
      success: true,
      session_name: sessionName,
      user_id: user.id,
      qr_code: qrCode,
      connected: isConnected,
      status: isConnected ? "connected" : (qrCode ? "waiting_qr" : "initializing"),
      session_status: sessionStatus,
    });
  } catch (error) {
    console.error("waha-create-session error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return json({ success: false, error: errorMessage }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchQRCode(baseUrl: string, apiKey: string, sessionName: string): Promise<string | null> {
  try {
    console.log('📥 Tentando buscar QR Code...');
    const response = await fetch(`${baseUrl}/api/${sessionName}/auth/qr`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        Accept: "image/png",
      },
    });

    console.log(`QR response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.log("QR fetch failed:", text);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    console.log('Content-Type:', contentType);

    if (contentType.includes("image")) {
      console.log('📸 Convertendo imagem para base64...');
      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      console.log('🎉 QR Code obtido como imagem base64!');
      console.log('QR Code length:', base64.length);
      return `data:image/png;base64,${base64}`;
    }

    const body = await response.text();
    console.log('QR Text response:', body.substring(0, 100));

    try {
      const parsed = JSON.parse(body);
      return parsed.value || parsed.qr || parsed.qrcode?.base64 || null;
    } catch {
      if (body && body.length > 10) {
        return body;
      }
    }
  } catch (error) {
    console.error("fetchQRCode error:", error);
  }

  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}
