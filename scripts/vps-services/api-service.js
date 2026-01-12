const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configurado para aceitar frontend
app.use(cors({
    origin: ['http://localhost:5173', 'http://72.60.14.172', 'https://brgestor.app'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Configuração do banco de dados
const pool = new Pool({
    host: 'typebot-db',
    port: 5432,
    database: 'brgestor',
    user: process.env.DB_USER || 'brgestor_user',
    password: process.env.DB_PASSWORD || 'Manu07062022'
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'brgestor-jwt-secret-2026';

// Log de inicialização
console.log('🚀 BR Gestor API Service iniciado');
console.log('📡 Endpoints disponíveis:');
console.log('   - POST /auth/login - Autenticação');
console.log('   - POST /auth/register - Registro');
console.log('   - GET /auth/user - Dados do usuário');
console.log('   - GET /customers - Lista clientes');
console.log('   - POST /customers - Criar cliente');
console.log('   - Webhooks: /api1/webhook, /api2/webhook');

// Teste de conexão com banco
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ [DB] Erro de conexão:', err.message);
    } else {
        console.log('✅ [DB] API service conectado ao banco!');
        release();
    }
});

// Middleware para log das requisições
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📨 [${timestamp}] ${req.method} ${req.path} - ${req.get('User-Agent') || 'Unknown'}`);
    next();
});

// Middleware para verificar JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// ==========================================
// AUTENTICAÇÃO
// ==========================================

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 [AUTH] Tentativa de login:', email);
        
        // Buscar usuário
        const userResult = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            console.log('❌ [AUTH] Usuário não encontrado:', email);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = userResult.rows[0];

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('❌ [AUTH] Senha incorreta para:', email);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar JWT
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                tenantId: user.tenant_id 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ [AUTH] Login bem-sucedido:', email);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tenant_id: user.tenant_id
            },
            access_token: token,
            expires_in: 86400 // 24 horas
        });

    } catch (error) {
        console.error('❌ [AUTH] Erro no login:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Registro (simplificado)
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        console.log('📝 [AUTH] Tentativa de registro:', email);

        // Verificar se usuário já existe
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 12);

        // Criar usuário
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name, tenant_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name, tenant_id',
            [email, hashedPassword, name, 'a0000000-0000-0000-0000-000000000000'] // tenant padrão
        );

        const user = result.rows[0];

        // Gerar JWT
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                tenantId: user.tenant_id 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ [AUTH] Registro bem-sucedido:', email);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tenant_id: user.tenant_id
            },
            access_token: token,
            expires_in: 86400
        });

    } catch (error) {
        console.error('❌ [AUTH] Erro no registro:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Dados do usuário atual
app.get('/auth/user', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, name, tenant_id FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('❌ [AUTH] Erro ao buscar usuário:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==========================================
// CLIENTES
// ==========================================

// Listar clientes
app.get('/customers', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM customers WHERE tenant_id = $1 ORDER BY created_at DESC',
            [req.user.tenantId]
        );

        res.json({ data: result.rows });
    } catch (error) {
        console.error('❌ [API] Erro ao listar clientes:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar cliente
app.post('/customers', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone, whatsapp_number } = req.body;
        
        const result = await pool.query(
            'INSERT INTO customers (tenant_id, name, email, phone, whatsapp_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.tenantId, name, email, phone, whatsapp_number]
        );

        console.log('✅ [API] Cliente criado:', name);
        res.json({ data: result.rows[0] });
    } catch (error) {
        console.error('❌ [API] Erro ao criar cliente:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==========================================
// WEBHOOKS (mantidos do webhook service)
// ==========================================

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

// ==========================================
// HEALTH E UTILITÁRIOS
// ==========================================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'BR Gestor API Service (substitui Supabase)'
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
const PORT = process.env.API_PORT || 3333;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎯 API service rodando na porta ${PORT}`);
    console.log(`🔗 URLs dos endpoints:`);
    console.log(`   - AUTH: http://localhost:${PORT}/auth/login`);
    console.log(`   - API 1: http://localhost:${PORT}/api1/webhook`);
    console.log(`   - API 2: http://localhost:${PORT}/api2/webhook`);
    console.log(`   - Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Encerrando API service...');
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Encerrando API service...');
    await pool.end();
    process.exit(0);
});