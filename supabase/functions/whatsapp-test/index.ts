import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    console.log('=== WHATSAPP-TEST - CRIAR QR CODE ===');
    
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User ID recebido:', userId);

    // Credenciais WAHA fixas
    const WAHA_API_KEY = 'BragaDIGITal_OBrabo_1996_2025Br';
    const WAHA_API_URL = `http://${Deno.env.get('VPS_IP') || '72.60.14.172'}:3000`;
    const sessionName = `cliente_${userId}`;
    
    console.log('Session:', sessionName);
    console.log('API URL:', WAHA_API_URL);
    
    // Step 1: Create/start session in WAHA
    console.log('1. Criando/iniciando sessão...');
    const createResponse = await fetch(`${WAHA_API_URL}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": WAHA_API_KEY,
      },
      body: JSON.stringify({
        name: sessionName,
        start: true,
        config: { proxy: null, webhooks: [] }
      }),
    });

    console.log('Create response status:', createResponse.status);

    // If session already exists, try to start it
    if (createResponse.status === 422 || createResponse.status === 409) {
      console.log('Sessão já existe, iniciando...');
      await fetch(`${WAHA_API_URL}/api/sessions/${sessionName}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WAHA_API_KEY,
        },
      });
    }

    // Wait for session to be ready for QR code (poll up to 10 seconds)
    let qrCode: string | null = null;
    let isConnected = false;
    let sessionStatus = "STARTING";
    
    console.log('2. Polling por QR Code (até 10 segundos)...');
    
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Tentativa ${attempt + 1}/10`);
      
      // Check session status
      const statusResponse = await fetch(`${WAHA_API_URL}/api/sessions/${sessionName}`, {
        method: "GET",
        headers: { "X-Api-Key": WAHA_API_KEY },
      });
      
      if (statusResponse.ok) {
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
          
          // Get QR Code as image
          const qrResponse = await fetch(`${WAHA_API_URL}/api/${sessionName}/auth/qr`, {
            method: "GET",
            headers: {
              "X-Api-Key": WAHA_API_KEY,
              "Accept": "image/png",
            },
          });
          
          console.log(`QR response status: ${qrResponse.status}`);
          
          if (qrResponse.ok) {
            const contentType = qrResponse.headers.get("content-type") || "";
            console.log('Content-Type:', contentType);
            
            if (contentType.includes("image")) {
              console.log('📸 Convertendo imagem para base64...');
              const imageBuffer = await qrResponse.arrayBuffer();
              const uint8Array = new Uint8Array(imageBuffer);
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
              }
              const base64 = btoa(binary);
              qrCode = `data:image/png;base64,${base64}`;
              
              console.log('🎉 QR Code obtido como imagem base64!');
              console.log('QR Code length:', qrCode.length);
              
            } else {
              const qrText = await qrResponse.text();
              console.log('QR Text response:', qrText.substring(0, 100));
              
              try {
                const qrData = JSON.parse(qrText);
                qrCode = qrData.value || qrData.qr || qrData.qrcode?.base64 || null;
              } catch {
                if (qrText && qrText.length > 10) {
                  qrCode = qrText;
                }
              }
            }
            
            if (qrCode) {
              console.log('✅ QR Code encontrado!');
              break;
            }
          } else {
            const errorText = await qrResponse.text();
            console.log('QR Error:', errorText);
          }
        }
      } else {
        console.log('Status check failed:', statusResponse.status);
      }
    }

    // Return response
    const result = {
      success: true,
      session_name: sessionName,
      user_id: userId,
      qr_code: qrCode,
      connected: isConnected,
      status: isConnected ? "connected" : (qrCode ? "waiting_qr" : "initializing"),
    };

    console.log('🎯 Resultado final:', JSON.stringify(result, null, 2));
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('💥 ERRO:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});