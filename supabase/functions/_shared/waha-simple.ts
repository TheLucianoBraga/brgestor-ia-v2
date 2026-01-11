// FUNÇÃO BASEADA NO PROJETO QUE FUNCIONA - WAHA PLUS
// 🔒 SEGURANÇA: Credenciais agora vêm de variáveis de ambiente
export async function createQRCode(userId: string) {
  const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');
  const WAHA_API_URL = Deno.env.get('WAHA_API_URL') || `http://${Deno.env.get('VPS_IP') || '72.60.14.172'}:3000`;
  const sessionName = `cliente_${userId}`;
  
  // Validar que as credenciais existem
  if (!WAHA_API_KEY) {
    throw new Error('WAHA_API_KEY não configurada nas variáveis de ambiente');
  }
  
  console.log('=== WAHA PLUS - ABORDAGEM QUE FUNCIONA ===');
  console.log('Session:', sessionName);
  console.log('API URL:', WAHA_API_URL);
  console.log('API Key:', WAHA_API_KEY ? '***' + WAHA_API_KEY.slice(-4) : 'MISSING'); // Ocultar chave nos logs
  
  try {
    // Step 1: Create/start session in WAHA PLUS
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
    const createData = await createResponse.text();
    console.log('Create response:', createData);

    // If session already exists, try to start it
    if (createResponse.status === 422 || createResponse.status === 409) {
      console.log('Sessão já existe, tentando iniciar...');
      
      const startResponse = await fetch(`${WAHA_API_URL}/api/sessions/${sessionName}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": WAHA_API_KEY,
        },
      });
      
      console.log('Start response status:', startResponse.status);
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
          
          // ENDPOINT CORRETO DO SEU PROJETO QUE FUNCIONA!
          const qrResponse = await fetch(`${WAHA_API_URL}/api/${sessionName}/auth/qr`, {
            method: "GET",
            headers: {
              "X-Api-Key": WAHA_API_KEY,
              "Accept": "image/png", // CRUCIAL: Accept image/png
            },
          });
          
          console.log(`QR response status: ${qrResponse.status}`);
          
          if (qrResponse.ok) {
            const contentType = qrResponse.headers.get("content-type") || "";
            console.log('Content-Type:', contentType);
            
            if (contentType.includes("image")) {
              // CONVERSÃO PARA BASE64 COMO NO SEU PROJETO
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
              // Fallback para JSON/texto
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

    // Return response IGUAL AO SEU PROJETO
    const result = {
      success: true,
      session_name: sessionName,
      user_id: userId,
      qr_code: qrCode,
      connected: isConnected,
      status: isConnected ? "connected" : (qrCode ? "waiting_qr" : "initializing"),
      sessionStatus: sessionStatus,
      attempts: 10
    };

    console.log('🎯 Resultado final:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('💥 ERRO:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      session_name: sessionName,
      user_id: userId
    };
  }
}