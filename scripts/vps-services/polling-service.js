/**
 * BRGESTOR - Polling Service para WhatsApp
 * Substitui as Edge Functions do Supabase
 * Roda na VPS com pm2 ou systemd
 */

const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'brgestor',
  user: process.env.DB_USER || 'brgestor_user',
  password: process.env.DB_PASSWORD || 'BrGestor_Secure_2026!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Configuração das APIs WhatsApp
const WAHA_URL = process.env.WAHA_URL || 'http://localhost:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY || 'BragaDIGITal_OBrabo_1996_2025Br';
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://localhost:8081';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'evolution_api_key_2026';

// Intervalo de polling (em ms)
const POLLING_INTERVAL = parseInt(process.env.POLLING_INTERVAL || '10000'); // 10 segundos

// Cache de mensagens processadas (evita duplicatas)
const processedMessages = new Map();
const MESSAGE_CACHE_TTL = 60 * 60 * 1000; // 1 hora

/**
 * Busca todas as instâncias WhatsApp ativas
 */
async function getActiveInstances() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        wi.id,
        wi.tenant_id,
        wi.instance_name,
        wi.phone_number,
        wi.status,
        ts_provider.value as provider,
        ts_url.value as api_url,
        ts_key.value as api_key
      FROM whatsapp_instances wi
      LEFT JOIN tenant_settings ts_provider ON ts_provider.tenant_id = wi.tenant_id AND ts_provider.key = 'whatsapp_provider'
      LEFT JOIN tenant_settings ts_url ON ts_url.tenant_id = wi.tenant_id AND ts_url.key = 'waha_api_url'
      LEFT JOIN tenant_settings ts_key ON ts_key.tenant_id = wi.tenant_id AND ts_key.key = 'waha_api_key'
      WHERE wi.status = 'connected'
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Busca mensagens novas da API WAHA
 */
async function fetchWahaMessages(sessionName, apiUrl, apiKey) {
  try {
    const url = `${apiUrl || WAHA_URL}/api/${sessionName}/chats`;
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey || WAHA_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`[WAHA] Erro ao buscar chats: ${response.status}`);
      return [];
    }
    
    const chats = await response.json();
    const messages = [];
    
    // Para cada chat, busca as últimas mensagens
    for (const chat of chats.slice(0, 10)) { // Limita a 10 chats por vez
      try {
        const messagesUrl = `${apiUrl || WAHA_URL}/api/${sessionName}/chats/${chat.id}/messages?limit=5`;
        const msgResponse = await fetch(messagesUrl, {
          headers: {
            'X-Api-Key': apiKey || WAHA_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (msgResponse.ok) {
          const chatMessages = await msgResponse.json();
          messages.push(...chatMessages.filter(m => !m.fromMe));
        }
      } catch (e) {
        console.error(`[WAHA] Erro ao buscar mensagens do chat ${chat.id}:`, e.message);
      }
    }
    
    return messages;
  } catch (error) {
    console.error('[WAHA] Erro no fetch:', error.message);
    return [];
  }
}

/**
 * Busca mensagens novas da API Evolution
 */
async function fetchEvolutionMessages(instanceName) {
  try {
    const url = `${EVOLUTION_URL}/chat/findMessages/${instanceName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        where: {
          key: {
            fromMe: false
          }
        },
        limit: 20
      })
    });
    
    if (!response.ok) {
      console.error(`[Evolution] Erro ao buscar mensagens: ${response.status}`);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('[Evolution] Erro no fetch:', error.message);
    return [];
  }
}

/**
 * Processa uma mensagem recebida
 */
async function processMessage(message, tenantId, provider) {
  const messageId = message.id?.id || message.key?.id || message.id;
  
  // Verifica se já foi processada
  if (processedMessages.has(messageId)) {
    return;
  }
  
  // Marca como processada
  processedMessages.set(messageId, Date.now());
  
  const client = await pool.connect();
  try {
    // Extrai dados da mensagem
    const phone = provider === 'waha' 
      ? message.from?.split('@')[0]
      : message.key?.remoteJid?.split('@')[0];
    
    const text = message.body || message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const contactName = message.notifyName || message.pushName || null;
    
    if (!phone || !text) {
      return;
    }
    
    console.log(`[${provider}] Nova mensagem de ${phone}: ${text.substring(0, 50)}...`);
    
    // Busca ou cria memória do chat
    let memory = await client.query(`
      SELECT * FROM chat_memory 
      WHERE tenant_id = $1 AND phone = $2
    `, [tenantId, phone]);
    
    if (memory.rows.length === 0) {
      // Cria nova memória
      await client.query(`
        INSERT INTO chat_memory (tenant_id, phone, contact_name, messages_count)
        VALUES ($1, $2, $3, 1)
      `, [tenantId, phone, contactName]);
      
      memory = await client.query(`
        SELECT * FROM chat_memory 
        WHERE tenant_id = $1 AND phone = $2
      `, [tenantId, phone]);
    } else {
      // Atualiza contador
      await client.query(`
        UPDATE chat_memory 
        SET messages_count = messages_count + 1,
            last_contact_at = now(),
            contact_name = COALESCE($3, contact_name)
        WHERE tenant_id = $1 AND phone = $2
      `, [tenantId, phone, contactName]);
    }
    
    // Salva mensagem no histórico
    await client.query(`
      INSERT INTO chat_messages_history (memory_id, role, content)
      VALUES ($1, 'user', $2)
    `, [memory.rows[0].id, text]);
    
    // Verifica se auto-resposta está habilitada
    const autoEnabled = await client.query(`
      SELECT value FROM tenant_settings 
      WHERE tenant_id = $1 AND key = 'wa_auto_enabled'
    `, [tenantId]);
    
    if (autoEnabled.rows.length > 0 && autoEnabled.rows[0].value === 'true') {
      // Aqui você pode adicionar lógica de IA para gerar resposta
      console.log(`[${provider}] Auto-resposta habilitada para tenant ${tenantId}`);
      // TODO: Integrar com Gemini/OpenAI para gerar resposta
    }
    
  } catch (error) {
    console.error('[Processor] Erro ao processar mensagem:', error.message);
  } finally {
    client.release();
  }
}

/**
 * Limpa cache de mensagens antigas
 */
function cleanupCache() {
  const now = Date.now();
  for (const [id, timestamp] of processedMessages) {
    if (now - timestamp > MESSAGE_CACHE_TTL) {
      processedMessages.delete(id);
    }
  }
}

/**
 * Loop principal de polling
 */
async function pollingLoop() {
  console.log('[Polling] Iniciando ciclo de polling...');
  
  try {
    const instances = await getActiveInstances();
    console.log(`[Polling] ${instances.length} instâncias ativas encontradas`);
    
    for (const instance of instances) {
      const provider = instance.provider || 'waha';
      
      let messages = [];
      if (provider === 'evolution') {
        messages = await fetchEvolutionMessages(instance.instance_name);
      } else {
        messages = await fetchWahaMessages(
          instance.instance_name,
          instance.api_url,
          instance.api_key
        );
      }
      
      for (const message of messages) {
        await processMessage(message, instance.tenant_id, provider);
      }
    }
    
    // Limpa cache periodicamente
    cleanupCache();
    
  } catch (error) {
    console.error('[Polling] Erro no loop:', error.message);
  }
  
  // Agenda próximo ciclo
  setTimeout(pollingLoop, POLLING_INTERVAL);
}

/**
 * Inicialização
 */
async function main() {
  console.log('='.repeat(50));
  console.log('BRGESTOR - Polling Service');
  console.log('='.repeat(50));
  console.log(`Intervalo de polling: ${POLLING_INTERVAL}ms`);
  console.log(`WAHA URL: ${WAHA_URL}`);
  console.log(`Evolution URL: ${EVOLUTION_URL}`);
  console.log('='.repeat(50));
  
  // Testa conexão com banco
  try {
    const client = await pool.connect();
    console.log('[DB] Conexão com banco OK');
    client.release();
  } catch (error) {
    console.error('[DB] Erro ao conectar:', error.message);
    process.exit(1);
  }
  
  // Inicia polling
  pollingLoop();
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('[Error] Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('[Error] Uncaught exception:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Shutdown] Recebido SIGTERM, encerrando...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Shutdown] Recebido SIGINT, encerrando...');
  await pool.end();
  process.exit(0);
});

// Inicia o serviço
main();
