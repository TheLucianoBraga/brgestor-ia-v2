// Função WhatsApp Local - substitui supabase-whatsapp-function.ts
// Integrada ao api-service.js principal

const express = require('express');
const { Pool } = require('pg');

// Pool de conexão já configurado no api-service.js principal
// Esta é uma implementação de referência para integração

class WhatsAppLocalService {
  constructor(pool, wahaConfig) {
    this.pool = pool;
    this.wahaUrl = wahaConfig.url;
    this.wahaApiKey = wahaConfig.apiKey;
  }

  async createInstance(userId, tenantId) {
    try {
      const sessionName = `tenant_${tenantId.substring(0, 8)}`;
      
      // Criar sessão no WAHA
      const response = await fetch(`${this.wahaUrl}/api/sessions/${sessionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.wahaApiKey
        },
        body: JSON.stringify({
          name: sessionName,
          config: {
            webhooks: [
              {
                url: `${process.env.BASE_URL}/api/webhooks/whatsapp`,
                events: ['message', 'session.status']
              }
            ]
          }
        })
      });

      const data = await response.json();

      // Log da operação
      await this.pool.query(`
        INSERT INTO whatsapp_instances (
          id, user_id, tenant_id, session_name, provider, status, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'waha', 'creating', NOW()
        )
        ON CONFLICT (session_name) 
        DO UPDATE SET status = 'creating', updated_at = NOW()
      `, [userId, tenantId, sessionName]);

      return {
        success: true,
        sessionName,
        qrCode: data.qr || null,
        status: data.status || 'creating'
      };

    } catch (error) {
      console.error('❌ [WhatsApp] Erro ao criar instância:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendMessage(sessionName, phone, text) {
    try {
      const response = await fetch(`${this.wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.wahaApiKey
        },
        body: JSON.stringify({
          session: sessionName,
          chatId: `${phone}@c.us`,
          text: text
        })
      });

      const data = await response.json();

      // Log da mensagem
      await this.pool.query(`
        INSERT INTO whatsapp_messages_log (
          id, session_name, phone, text_preview, direction, status, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'outgoing', 'sent', NOW()
        )
      `, [sessionName, phone, text.substring(0, 50)]);

      return {
        success: true,
        messageId: data.id,
        status: data.status
      };

    } catch (error) {
      console.error('❌ [WhatsApp] Erro ao enviar mensagem:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getStatus(sessionName) {
    try {
      const response = await fetch(`${this.wahaUrl}/api/sessions/${sessionName}`, {
        method: 'GET',
        headers: {
          'X-Api-Key': this.wahaApiKey
        }
      });

      const data = await response.json();

      return {
        success: true,
        status: data.status,
        qrCode: data.qr || null
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleWebhook(payload) {
    try {
      const { event, session, payload: messageData } = payload;

      if (event === 'message' && !messageData.fromMe) {
        // Processar mensagem recebida
        await this.pool.query(`
          INSERT INTO whatsapp_messages_log (
            id, session_name, phone, text_preview, direction, status, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, 'incoming', 'received', NOW()
          )
        `, [session, messageData.from.replace('@c.us', ''), messageData.body?.substring(0, 50) || '']);

        // Aqui pode ser implementada lógica de auto-resposta, IA, etc.
      }

      if (event === 'session.status') {
        // Atualizar status da sessão
        await this.pool.query(`
          UPDATE whatsapp_instances 
          SET status = $1, updated_at = NOW()
          WHERE session_name = $2
        `, [messageData.status, session]);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ [WhatsApp] Erro no webhook:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = WhatsAppLocalService;

// Para integração no api-service.js principal:
/*
const WhatsAppLocalService = require('./whatsapp-local-service');

const whatsappService = new WhatsAppLocalService(pool, {
  url: process.env.WAHA_URL,
  apiKey: process.env.WAHA_API_KEY
});

// Rotas WhatsApp
app.post('/api/whatsapp/create-instance', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  const result = await whatsappService.createInstance(userId, req.user.tenantId);
  res.json(result);
});

app.post('/api/whatsapp/send-message', authenticateToken, async (req, res) => {
  const { phone, text } = req.body;
  const sessionName = `tenant_${req.user.tenantId.substring(0, 8)}`;
  const result = await whatsappService.sendMessage(sessionName, phone, text);
  res.json(result);
});

app.get('/api/whatsapp/status', authenticateToken, async (req, res) => {
  const sessionName = `tenant_${req.user.tenantId.substring(0, 8)}`;
  const result = await whatsappService.getStatus(sessionName);
  res.json(result);
});

app.post('/api/webhooks/whatsapp', async (req, res) => {
  const result = await whatsappService.handleWebhook(req.body);
  res.json(result);
});
*/