const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Configuração do banco de dados
const pool = new Pool({
    host: 'typebot-db',
    port: 5432,
    database: 'brgestor',
    user: process.env.DB_USER || 'brgestor_user',
    password: process.env.DB_PASSWORD || 'Manu07062022'
});

// Log de inicialização
console.log('🚀 BR Gestor Webhook Service iniciado');
console.log('📡 Escutando webhooks nas portas:');
console.log('   - API 1 (WAHA): /api1/webhook');
console.log('   - API 2 (Evolution): /api2/webhook');

// Teste de conexão com banco
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ [DB] Erro de conexão:', err.message);
    } else {
        console.log('✅ [DB] Webhook service conectado ao banco!');
        release();
    }
});

// Middleware para log das requisições
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📨 [${timestamp}] ${req.method} ${req.path} - ${req.get('User-Agent') || 'Unknown'}`);
    next();
});

// Webhook para API 1 (WAHA)
app.post('/api1/webhook', async (req, res) => {
    try {
        console.log('📥 [API1] Webhook recebido:', JSON.stringify(req.body, null, 2));
        
        const payload = req.body;
        
        // Salvar log da mensagem
        if (payload.event === 'message' && payload.data) {
            await pool.query(`
                INSERT INTO whatsapp_messages_log 
                (tenant_id, instance_name, from_number, to_number, message_text, message_type, raw_payload, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, now())
            `, [
                'a0000000-0000-0000-0000-000000000000', // tenant_id padrão
                'API_1_WAHA',
                payload.data.from || '',
                payload.data.to || '',
                payload.data.body || payload.data.text || '',
                payload.data.type || 'text',
                JSON.stringify(payload)
            ]);
            
            console.log('✅ [API1] Mensagem salva no banco');
        }
        
        res.json({ success: true, message: 'Webhook processado com sucesso' });
        
    } catch (error) {
        console.error('❌ [API1] Erro no webhook:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Webhook para API 2 (Evolution)
app.post('/api2/webhook', async (req, res) => {
    try {
        console.log('📥 [API2] Webhook recebido:', JSON.stringify(req.body, null, 2));
        
        const payload = req.body;
        
        // Salvar log da mensagem
        if (payload.event === 'messages.upsert' && payload.data) {
            const message = payload.data.messages?.[0] || payload.data;
            
            await pool.query(`
                INSERT INTO whatsapp_messages_log 
                (tenant_id, instance_name, from_number, to_number, message_text, message_type, raw_payload, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, now())
            `, [
                'a0000000-0000-0000-0000-000000000000', // tenant_id padrão
                'API_2_EVOLUTION',
                message.key?.remoteJid || '',
                payload.instance || '',
                message.message?.conversation || message.message?.extendedTextMessage?.text || '',
                'text',
                JSON.stringify(payload)
            ]);
            
            console.log('✅ [API2] Mensagem salva no banco');
        }
        
        res.json({ success: true, message: 'Webhook processado com sucesso' });
        
    } catch (error) {
        console.error('❌ [API2] Erro no webhook:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'BR Gestor Webhook Service'
    });
});

// Endpoint para testar conexão com banco
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM whatsapp_instances');
        res.json({ 
            success: true, 
            database: 'connected',
            whatsapp_instances: result.rows[0].total 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Porta do serviço
const PORT = process.env.WEBHOOK_PORT || 3333;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎯 Webhook service rodando na porta ${PORT}`);
    console.log(`🔗 URLs dos endpoints:`);
    console.log(`   - API 1: http://localhost:${PORT}/api1/webhook`);
    console.log(`   - API 2: http://localhost:${PORT}/api2/webhook`);
    console.log(`   - Health: http://localhost:${PORT}/health`);
    console.log(`   - Test DB: http://localhost:${PORT}/test-db`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Encerrando webhook service...');
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Encerrando webhook service...');
    await pool.end();
    process.exit(0);
});