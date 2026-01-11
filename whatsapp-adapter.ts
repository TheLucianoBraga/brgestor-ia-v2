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
    try {
      const sessionName = `user_${userId}`;
      
      const response = await fetch(`${this.baseUrl}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          name: sessionName,
          config: {
            webhooks: [],
            debug: false
          }
        }),
      });

      const data: WahaResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(`WAHA API Error: ${data.error || response.statusText}`);
      }

      // Obter QR Code
      const qrResponse = await fetch(`${this.baseUrl}/api/sessions/${sessionName}/auth/qr`, {
        method: 'GET',
        headers: {
          'X-Api-Key': this.apiKey,
        },
      });

      const qrData = await qrResponse.json();

      return {
        success: true,
        sessionName: sessionName,
        qrCode: qrData.qr,
        provider: 'waha'
      };
    } catch (error) {
      console.error('WAHA createInstance error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
        headers['X-Api-Key'] = Deno.env.get('WAHA_API_KEY') || 'waha_api_key_2026';
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