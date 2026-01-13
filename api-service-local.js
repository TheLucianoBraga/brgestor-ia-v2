const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3333;
const JWT_SECRET = process.env.JWT_SECRET || 'brgestor_jwt_secret_2026_super_secure';

// PostgreSQL Connection (localhost:5433 é a porta externa do container typebot-db)
const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'brgestor',
    user: 'brgestor_user',
    password: 'Manu07062022'
});

// CORS - Permitir todas as origens
app.use(cors({
    origin: '*',  // Aceitar TODAS origens (temporário para debug)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info', 'Prefer']
}));

app.use(express.json());

// Middleware para extrair usuário do JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        req.user = null;
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        req.user = null;
        next();
    }
};

app.use(authenticateToken);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'brgestor-api' });
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as time, current_database() as db');
        res.json({ status: 'OK', ...result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// AUTH ENDPOINTS
// ============================================
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        const result = await pool.query(
            'SELECT id, email, encrypted_password, raw_user_meta_data FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.encrypted_password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const token = jwt.sign(
            { 
                sub: user.id, 
                email: user.email,
                user_metadata: user.raw_user_meta_data || {}
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            access_token: token,
            token_type: 'bearer',
            expires_in: 604800,
            user: {
                id: user.id,
                email: user.email,
                user_metadata: user.raw_user_meta_data || {}
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, user_metadata = {} } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        // Verificar se usuário existe
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = require('crypto').randomUUID();
        
        await pool.query(
            'INSERT INTO users (id, email, encrypted_password, raw_user_meta_data, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
            [userId, email.toLowerCase(), hashedPassword, JSON.stringify(user_metadata)]
        );
        
        const token = jwt.sign(
            { sub: userId, email: email.toLowerCase(), user_metadata },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            access_token: token,
            token_type: 'bearer',
            user: {
                id: userId,
                email: email.toLowerCase(),
                user_metadata
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/auth/user', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Não autenticado' });
    }
    
    try {
        const result = await pool.query(
            'SELECT id, email, raw_user_meta_data FROM users WHERE id = $1',
            [req.user.sub]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const user = result.rows[0];
        res.json({
            id: user.id,
            email: user.email,
            user_metadata: user.raw_user_meta_data || {}
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/auth/logout', (req, res) => {
    res.json({ message: 'Logout realizado com sucesso' });
});

app.post('/auth/recover', async (req, res) => {
    res.json({ message: 'Email de recuperação enviado (simulado)' });
});

// ============================================
// REST API GENÉRICA (estilo Supabase/PostgREST)
// ============================================

// Helper para parsear filtros do Supabase
function parseFilters(query) {
    const filters = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(query)) {
        if (['select', 'order', 'limit', 'offset', 'count'].includes(key)) continue;
        
        if (typeof value === 'string') {
            const match = value.match(/^(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd)\.(.*)$/);
            if (match) {
                const [, op, val] = match;
                switch (op) {
                    case 'eq':
                        filters.push(`${key} = $${paramIndex++}`);
                        values.push(val);
                        break;
                    case 'neq':
                        filters.push(`${key} != $${paramIndex++}`);
                        values.push(val);
                        break;
                    case 'gt':
                        filters.push(`${key} > $${paramIndex++}`);
                        values.push(val);
                        break;
                    case 'gte':
                        filters.push(`${key} >= $${paramIndex++}`);
                        values.push(val);
                        break;
                    case 'lt':
                        filters.push(`${key} < $${paramIndex++}`);
                        values.push(val);
                        break;
                    case 'lte':
                        filters.push(`${key} <= $${paramIndex++}`);
                        values.push(val);
                        break;
                    case 'like':
                        filters.push(`${key} LIKE $${paramIndex++}`);
                        values.push(val);
                        break;
                    case 'ilike':
                        filters.push(`${key} ILIKE $${paramIndex++}`);
                        values.push(val);
                        break;
                    case 'is':
                        if (val === 'null') {
                            filters.push(`${key} IS NULL`);
                        } else if (val === 'true') {
                            filters.push(`${key} IS TRUE`);
                        } else if (val === 'false') {
                            filters.push(`${key} IS FALSE`);
                        }
                        break;
                    case 'in':
                        const inValues = val.replace(/[()]/g, '').split(',');
                        const placeholders = inValues.map(() => `$${paramIndex++}`).join(',');
                        filters.push(`${key} IN (${placeholders})`);
                        values.push(...inValues);
                        break;
                }
            }
        }
    }
    
    return { filters, values, paramIndex };
}

// Tabelas permitidas (whitelist de segurança) - Todas as tabelas do banco
const ALLOWED_TABLES = [
    'activity_logs',
    'charges',
    'chat_memory',
    'chat_messages_history',
    'chat_ratings',
    'clients',
    'content_posts',
    'coupon_redemptions',
    'coupons',
    'customer_addresses',
    'customer_charges',
    'customer_contacts',
    'customer_items',
    'customer_referral_links',
    'customer_referrals',
    'customer_vehicles',
    'customers',
    'expense_ai_learning',
    'expense_allocations',
    'expense_attachments',
    'expense_categories',
    'expense_cost_centers',
    'expense_history',
    'expense_reminders',
    'expenses',
    'group_autoresponder_config',
    'message_logs',
    'message_templates',
    'note_ai_actions',
    'notes',
    'notification_preferences',
    'notifications',
    'payments',
    'plan_features',
    'plan_prices',
    'plans',
    'profiles',
    'ref_codes',
    'referral_history',
    'referral_links',
    'referral_transactions',
    'services',
    'subscriptions',
    'tenant_members',
    'tenant_settings',
    'tenants',
    'users',
    'whatsapp_groups',
    'whatsapp_instances',
    'whatsapp_instances_log',
    'whatsapp_messages_log',
    // Novas tabelas criadas
    'chatbot_config',
    'chatbot_flows',
    'chatbot_messages',
    'chatbot_sessions',
    'whatsapp_messages',
    'whatsapp_contacts',
    'products',
    'product_categories',
    'orders',
    'order_items',
    'order_status_history'
];

// GET /rest/v1/:table - Listar registros
app.get('/rest/v1/:table', async (req, res) => {
    const { table } = req.params;
    
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(404).json({ error: `Tabela '${table}' não encontrada` });
    }
    
    try {
        const { select = '*', order, limit, offset } = req.query;
        const { filters, values } = parseFilters(req.query);
        
        let sql = `SELECT ${select} FROM ${table}`;
        
        if (filters.length > 0) {
            sql += ' WHERE ' + filters.join(' AND ');
        }
        
        if (order) {
            const [col, dir = 'asc'] = order.split('.');
            sql += ` ORDER BY ${col} ${dir.toUpperCase()}`;
        }
        
        if (limit) {
            sql += ` LIMIT ${parseInt(limit)}`;
        }
        
        if (offset) {
            sql += ` OFFSET ${parseInt(offset)}`;
        }
        
        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error(`GET /rest/v1/${table} error:`, err);
        res.status(500).json({ error: err.message, details: err.detail });
    }
});

// POST /rest/v1/:table - Criar registro
app.post('/rest/v1/:table', async (req, res) => {
    const { table } = req.params;
    
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(404).json({ error: `Tabela '${table}' não encontrada` });
    }
    
    try {
        const data = req.body;
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await pool.query(sql, values);
        
        const prefer = req.headers['prefer'];
        if (prefer && prefer.includes('return=minimal')) {
            return res.status(201).send();
        }
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(`POST /rest/v1/${table} error:`, err);
        res.status(500).json({ error: err.message, details: err.detail });
    }
});

// PATCH /rest/v1/:table - Atualizar registros
app.patch('/rest/v1/:table', async (req, res) => {
    const { table } = req.params;
    
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(404).json({ error: `Tabela '${table}' não encontrada` });
    }
    
    try {
        const data = req.body;
        const { filters, values: filterValues } = parseFilters(req.query);
        
        if (filters.length === 0) {
            return res.status(400).json({ error: 'Filtros são obrigatórios para PATCH' });
        }
        
        const columns = Object.keys(data);
        const updateValues = Object.values(data);
        const setClauses = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
        
        // Ajustar índices dos filtros
        const adjustedFilters = filters.map(f => {
            return f.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + columns.length}`);
        });
        
        const sql = `UPDATE ${table} SET ${setClauses} WHERE ${adjustedFilters.join(' AND ')} RETURNING *`;
        const result = await pool.query(sql, [...updateValues, ...filterValues]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(`PATCH /rest/v1/${table} error:`, err);
        res.status(500).json({ error: err.message, details: err.detail });
    }
});

// DELETE /rest/v1/:table - Deletar registros
app.delete('/rest/v1/:table', async (req, res) => {
    const { table } = req.params;
    
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(404).json({ error: `Tabela '${table}' não encontrada` });
    }
    
    try {
        const { filters, values } = parseFilters(req.query);
        
        if (filters.length === 0) {
            return res.status(400).json({ error: 'Filtros são obrigatórios para DELETE' });
        }
        
        const sql = `DELETE FROM ${table} WHERE ${filters.join(' AND ')} RETURNING *`;
        const result = await pool.query(sql, values);
        
        res.json(result.rows);
    } catch (err) {
        console.error(`DELETE /rest/v1/${table} error:`, err);
        res.status(500).json({ error: err.message, details: err.detail });
    }
});

// ============================================
// RPC - Chamadas de funções
// ============================================
app.post('/rest/v1/rpc/:function', async (req, res) => {
    const { function: funcName } = req.params;
    const params = req.body;
    
    try {
        const paramNames = Object.keys(params);
        const paramValues = Object.values(params);
        const placeholders = paramNames.map((name, i) => `${name} := $${i + 1}`).join(', ');
        
        const sql = `SELECT * FROM ${funcName}(${placeholders})`;
        const result = await pool.query(sql, paramValues);
        
        res.json(result.rows);
    } catch (err) {
        console.error(`RPC /${funcName} error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// WEBHOOKS - WhatsApp
// ============================================
app.post('/api1/webhook', async (req, res) => {
    console.log('Webhook API 1 (WAHA):', JSON.stringify(req.body, null, 2));
    
    try {
        const { event, payload } = req.body;
        
        if (event === 'message' && payload) {
            await pool.query(
                'INSERT INTO whatsapp_messages (instance_id, message_id, from_number, to_number, body, message_type, direction, raw_data, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
                [
                    payload.session || 'default',
                    payload.id,
                    payload.from,
                    payload.to,
                    payload.body || '',
                    payload.type || 'text',
                    'incoming',
                    JSON.stringify(req.body)
                ]
            );
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Webhook API 1 error:', err);
        res.json({ success: true });
    }
});

app.post('/api2/webhook', async (req, res) => {
    console.log('Webhook API 2 (Evolution):', JSON.stringify(req.body, null, 2));
    
    try {
        const { event, data } = req.body;
        
        if (event === 'messages.upsert' && data) {
            await pool.query(
                'INSERT INTO whatsapp_messages (instance_id, message_id, from_number, to_number, body, message_type, direction, raw_data, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
                [
                    data.instance || 'default',
                    data.key?.id,
                    data.key?.remoteJid,
                    data.key?.fromMe ? data.key?.remoteJid : 'me',
                    data.message?.conversation || data.message?.extendedTextMessage?.text || '',
                    'text',
                    data.key?.fromMe ? 'outgoing' : 'incoming',
                    JSON.stringify(req.body)
                ]
            );
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Webhook API 2 error:', err);
        res.json({ success: true });
    }
});

// ============================================
// CUSTOMERS (legado)
// ============================================
app.get('/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/customers', async (req, res) => {
    try {
        const { name, phone, email, tenant_id } = req.body;
        const result = await pool.query(
            'INSERT INTO customers (name, phone, email, tenant_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [name, phone, email, tenant_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// STORAGE (stub)
// ============================================
app.get('/storage/v1/object/:bucket/*', (req, res) => {
    res.status(404).json({ error: 'Storage não implementado ainda' });
});

app.post('/storage/v1/object/:bucket/*', (req, res) => {
    res.status(501).json({ error: 'Upload não implementado ainda' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BRGestor API rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 REST API: http://localhost:${PORT}/rest/v1/:table`);
});
