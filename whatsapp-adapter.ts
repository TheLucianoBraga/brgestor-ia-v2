// WhatsApp Provider Adapter - Serviços Locais VPS
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

// Exemplo de uso em Express.js local:
/*
const express = require('express');
const { createInstance, sendMessage, getProviderStatus } = require('./whatsapp-adapter');

const app = express();

app.post('/whatsapp/create-instance', async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await createInstance(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/whatsapp/send-message', async (req, res) => {
  try {
    const { phone, text } = req.body;
    const result = await sendMessage(phone, text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/whatsapp/status', async (req, res) => {
  try {
    const result = await getProviderStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('WhatsApp API running on port 3001'));
*/