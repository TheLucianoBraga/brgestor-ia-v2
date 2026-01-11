// WhatsApp Provider Adapter - Supabase Edge Functions
// Adapter Pattern para Evolution API ou WAHA

interface WhatsAppProvider {
  createInstance(userId: string): Promise<any>;
  sendMessage(phone: string, text: string): Promise<any>;
}

interface EvolutionResponse {
  success: boolean;
  instance?: any;
  message?: any;
  error?: string;
}

interface WahaResponse {
  success: boolean;
  session?: any;
  message?: any;
  error?: string;
}

class EvolutionAdapter implements WhatsAppProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async createInstance(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          instanceName: `user_${userId}`,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        }),
      });

      const data: EvolutionResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(`Evolution API Error: ${data.error || response.statusText}`);
      }

      return {
        success: true,
        instanceName: `user_${userId}`,
        qrCode: data.instance?.qrcode?.base64,
        provider: 'evolution'
      };
    } catch (error) {
      console.error('Evolution createInstance error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'evolution'
      };
    }
  }

  async sendMessage(phone: string, text: string): Promise<any> {
    try {
      // Assumindo que temos a instância ativa (pode ser passada como parâmetro)
      const instanceName = 'user_default'; // ou obter dinamicamente
      
      const response = await fetch(`${this.baseUrl}/message/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          number: phone,
          text: text,
          instanceName: instanceName
        }),
      });

      const data: EvolutionResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(`Evolution API Error: ${data.error || response.statusText}`);
      }

      return {
        success: true,
        messageId: data.message?.id,
        phone: phone,
        text: text,
        provider: 'evolution'
      };
    } catch (error) {
      console.error('Evolution sendMessage error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'evolution'
      };
    }
  }
}

class WahaAdapter implements WhatsAppProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async createInstance(userId: string): Promise<any> {
    const sessionName = `session_${userId.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    try {
      console.log(`Creating WAHA session: ${sessionName}`);
      
      // 1. Criar sessão
      const createPayload = {
        name: sessionName,
        config: {
          webhooks: [],
          debug: true
        }
      };
      
      console.log('Creating session with payload:', JSON.stringify(createPayload));
      
      const createResponse = await fetch(`${this.baseUrl}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(createPayload)
      });
      
      console.log('Create response status:', createResponse.status);
      const createResponseText = await createResponse.text();
      console.log('Create response body:', createResponseText);
      
      if (!createResponse.ok && createResponse.status !== 409) { // 409 = já existe
        throw new Error(`Failed to create session: ${createResponse.status} - ${createResponseText}`);
      }
      
      // 2. Iniciar sessão e capturar resposta que pode conter QR
      console.log(`Starting session: ${sessionName}`);
      
      const startResponse = await fetch(`${this.baseUrl}/api/sessions/${sessionName}/start`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
        },
      });
      
      console.log('Start response status:', startResponse.status);
      
      let startResponseData = null;
      if (startResponse.ok) {
        const startText = await startResponse.text();
        console.log('Start response text:', startText.substring(0, 200));
        
        try {
          startResponseData = JSON.parse(startText);
          // Verificar se o QR code vem no response do start
          if (startResponseData.qr || startResponseData.qrcode || startResponseData.qrCode) {
            const qrCode = startResponseData.qr || startResponseData.qrcode || startResponseData.qrCode;
            console.log('QR Code found in start response!', qrCode.length);
            
            return {
              success: true,
              sessionName: sessionName,
              qrCode: qrCode,
              provider: 'waha',
              debug: {
                createStatus: createResponse.status,
                startStatus: startResponse.status,
                qrSource: 'start_response'
              }
            };
          }
        } catch (e) {
          console.log('Start response not JSON:', e);
        }
      } else {
        const startError = await startResponse.text();
        console.log('Start error:', startError);
      }
      
      // 3. Polling inteligente para QR Code
      console.log('Starting intelligent QR polling...');
      
      for (let attempt = 1; attempt <= 10; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s entre tentativas
        
        console.log(`Polling attempt ${attempt}/10`);
        
        // Verificar status da sessão primeiro
        const statusResponse = await fetch(`${this.baseUrl}/api/sessions/${sessionName}`, {
          method: 'GET',
          headers: {
            'X-Api-Key': this.apiKey,
          },
        });
        
        if (statusResponse.ok) {
          const sessionData = await statusResponse.json();
          console.log(`Attempt ${attempt} - Session status: ${sessionData.status}`);
          
          // Se mudou para AUTHENTICATED, não precisa mais de QR
          if (sessionData.status === 'AUTHENTICATED') {
            return {
              success: true,
              sessionName: sessionName,
              status: 'ALREADY_AUTHENTICATED',
              message: 'Session authenticated while waiting for QR',
              provider: 'waha'
            };
          }
          
          // Verificar se tem QR code nos dados da sessão
          if (sessionData.qr || sessionData.qrcode || sessionData.qrCode) {
            const qrCode = sessionData.qr || sessionData.qrcode || sessionData.qrCode;
            console.log(`QR Code found in session data on attempt ${attempt}!`);
            
            return {
              success: true,
              sessionName: sessionName,
              qrCode: qrCode,
              attempts: attempt,
              provider: 'waha',
              debug: {
                createStatus: createResponse.status,
                startStatus: startResponse.status,
                qrSource: 'session_polling'
              }
            };
          }
        }
        
        // Tentar endpoints de QR mais comuns
        const qrEndpoints = [
          `/api/sessions/${sessionName}/qr`,
          `/api/${sessionName}/qr`
        ];
        
        for (const endpoint of qrEndpoints) {
          const qrResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'X-Api-Key': this.apiKey,
            },
          });
          
          if (qrResponse.ok) {
            const qrText = await qrResponse.text();
            let qrCode = null;
            
            try {
              const qrData = JSON.parse(qrText);
              qrCode = qrData.qr || qrData.qrcode || qrData.base64 || qrData.url || qrData.code || qrData.qrCode;
            } catch {
              if (qrText.length > 50) {
                qrCode = qrText;
              }
            }
            
            if (qrCode) {
              console.log(`QR Code found via ${endpoint} on attempt ${attempt}!`);
              
              return {
                success: true,
                sessionName: sessionName,
                qrCode: qrCode,
                attempts: attempt,
                provider: 'waha',
                debug: {
                  createStatus: createResponse.status,
                  startStatus: startResponse.status,
                  qrSource: endpoint
                }
              };
            }
          }
        }
      }
      
      
      // Se chegou aqui, não conseguiu obter QR code após todas as tentativas
      console.log('QR Code not found after all attempts');
      
      return {
        success: true,
        sessionName: sessionName,
        qrCode: null,
        message: 'Session created and active (SCAN_QR_CODE) but QR code endpoint not found',
        provider: 'waha',
        suggestion: 'Try the get-qr endpoint or check WAHA documentation for QR endpoints',
        debug: {
          createStatus: createResponse.status,
          startStatus: startResponse.status,
          finalSessionStatus: 'SCAN_QR_CODE',
          attempts: 10
        }
      };
      
    } catch (error) {
      console.error('WAHA createInstance error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionName: sessionName,
        provider: 'waha'
      };
    }
  }

  async sendMessage(phone: string, text: string): Promise<any> {
    try {
      // Assumindo que temos a sessão ativa
      const sessionName = 'user_default'; // ou obter dinamicamente
      
      const response = await fetch(`${this.baseUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          session: sessionName,
          chatId: `${phone}@c.us`,
          text: text
        }),
      });

      const data: WahaResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(`WAHA API Error: ${data.error || response.statusText}`);
      }

      return {
        success: true,
        messageId: data.message?.id,
        phone: phone,
        text: text,
        provider: 'waha'
      };
    } catch (error) {
      console.error('WAHA sendMessage error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'waha'
      };
    }
  }
}

// Factory para criar o provider correto
class WhatsAppProviderFactory {
  static create(): WhatsAppProvider {
    const provider = Deno.env.get('CURRENT_PROVIDER') || 'waha';
    const vpsIp = Deno.env.get('VPS_IP') || '72.60.14.172';
    
    switch (provider.toLowerCase()) {
      case 'evolution':
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY') || 'evolution_api_key_2026';
        return new EvolutionAdapter(`http://${vpsIp}:8081`, evolutionApiKey);
      
      case 'waha':
        const wahaApiKey = Deno.env.get('WAHA_API_KEY') || 'waha_api_key_2026';
        return new WahaAdapter(`http://${vpsIp}:3000`, wahaApiKey);
      
      default:
        throw new Error(`Unsupported WhatsApp provider: ${provider}`);
    }
  }
}

// Funções principais expostas (Facade Pattern)
export async function createInstance(userId: string): Promise<any> {
  try {
    const provider = WhatsAppProviderFactory.create();
    const result = await provider.createInstance(userId);
    
    // Log para monitoramento
    console.log('createInstance result:', {
      userId,
      success: result.success,
      provider: result.provider,
      error: result.error || null
    });
    
    return result;
  } catch (error) {
    console.error('createInstance factory error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Factory error',
      provider: 'unknown'
    };
  }
}

export async function sendMessage(phone: string, text: string): Promise<any> {
  try {
    const provider = WhatsAppProviderFactory.create();
    const result = await provider.sendMessage(phone, text);
    
    // Log para monitoramento
    console.log('sendMessage result:', {
      phone,
      textLength: text.length,
      success: result.success,
      provider: result.provider,
      error: result.error || null
    });
    
    return result;
  } catch (error) {
    console.error('sendMessage factory error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Factory error',
      provider: 'unknown'
    };
  }
}

// Função utilitária para verificar status do provider atual
export async function getProviderStatus(): Promise<any> {
  try {
    const provider = Deno.env.get('CURRENT_PROVIDER') || 'waha';
    const vpsIp = Deno.env.get('VPS_IP') || '72.60.14.172';
    
    let healthUrl: string;
    let headers: Record<string, string> = {};
    
    switch (provider.toLowerCase()) {
      case 'evolution':
        healthUrl = `http://${vpsIp}:8081/instance/fetchInstances`;
        headers['apikey'] = Deno.env.get('EVOLUTION_API_KEY') || 'evolution_api_key_2026';
        break;
      case 'waha':
        healthUrl = `http://${vpsIp}:3000/api/sessions`;
        headers['X-Api-Key'] = Deno.env.get('WAHA_API_KEY') || 'waha2026';
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: headers,
    });
    
    return {
      success: response.ok,
      provider: provider,
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      provider: Deno.env.get('CURRENT_PROVIDER') || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Exemplo de uso em Supabase Edge Function:
/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createInstance, sendMessage, getProviderStatus } from "./whatsapp-adapter.ts"

serve(async (req) => {
  const { method } = req;
  const url = new URL(req.url);
  
  try {
    switch (url.pathname) {
      case '/create-instance':
        if (method !== 'POST') return new Response('Method not allowed', { status: 405 });
        const { userId } = await req.json();
        const result = await createInstance(userId);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      
      case '/send-message':
        if (method !== 'POST') return new Response('Method not allowed', { status: 405 });
        const { phone, text } = await req.json();
        const messageResult = await sendMessage(phone, text);
        return new Response(JSON.stringify(messageResult), {
          headers: { 'Content-Type': 'application/json' },
        });
      
      case '/status':
        const statusResult = await getProviderStatus();
        return new Response(JSON.stringify(statusResult), {
          headers: { 'Content-Type': 'application/json' },
        });
      
      default:
        return new Response('Not found', { status: 404 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
*/