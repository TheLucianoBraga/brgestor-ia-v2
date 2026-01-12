const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ==========================================
// CORS - TODAS AS ORIGENS PERMITIDAS
// ==========================================
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:3000',
        'http://72.60.14.172',
        'https://brgestor.app',
        'https://brgestor.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info', 'Prefer']
}));

app.use(express.json({ limit: '50mb' }));

// ==========================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ==========================================
const pool = new Pool({
    host: process.env.DB_HOST || 'typebot-db',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'brgestor',
    user: process.env.DB_USER || 'brgestor_user',
    password: process.env.DB_PASSWORD || 'Manu07062022',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'brgestor-jwt-secret-2026';

// ==========================================
// LOG DE INICIALIZAÇÃO
// ==========================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('🚀 BR Gestor API Service - VPS Edition');
console.log('═══════════════════════════════════════════════════════════════');
console.log('📡 Endpoints disponíveis:');
console.log('   AUTH:');
console.log('     - POST /auth/login');
console.log('     - POST /auth/register');
console.log('     - GET  /auth/user');
console.log('     - POST /auth/reset-password');
console.log('   REST GENÉRICO (substitui Supabase PostgREST):');
console.log('     - GET    /rest/v1/:table');
console.log('     - POST   /rest/v1/:table');
console.log('     - PATCH  /rest/v1/:table');
console.log('     - DELETE /rest/v1/:table');
console.log('   RPC (funções):');
console.log('     - POST /rpc/:function_name');
console.log('   WEBHOOKS:');
console.log('     - POST /api1/webhook');
console.log('     - POST /api2/webhook');
console.log('   UTILITÁRIOS:');
console.log('     - GET /health');
console.log('     - GET /test-db');
console.log('═══════════════════════════════════════════════════════════════');

// Teste de conexão com banco
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ [DB] Erro de conexão:', err.message);
    } else {
        console.log('✅ [DB] Conectado ao PostgreSQL!');
        release();
    }
});

// ==========================================
// MIDDLEWARE - LOG DE REQUISIÇÕES
// ==========================================
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📨 [${timestamp}] ${req.method} ${req.path}`);
    next();
});

// ==========================================
// MIDDLEWARE - AUTENTICAÇÃO JWT
// ==========================================
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: 'Token de acesso requerido',
            message: 'No access token provided',
            code: 'AUTH_TOKEN_REQUIRED'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ 
            error: 'Token inválido ou expirado',
            message: error.message,
            code: 'AUTH_TOKEN_INVALID'
        });
    }
};

// Middleware opcional de autenticação (não bloqueia se não tiver token)
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Token inválido, mas não bloqueia
            req.user = null;
        }
    }
    next();
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
            return res.status(401).json({ 
                error: 'Credenciais inválidas',
                message: 'Invalid login credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = userResult.rows[0];

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('❌ [AUTH] Senha incorreta para:', email);
            return res.status(401).json({ 
                error: 'Credenciais inválidas',
                message: 'Invalid login credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Gerar JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                tenantId: user.tenant_id,
                role: user.role || 'user'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ [AUTH] Login bem-sucedido:', email);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tenant_id: user.tenant_id,
                role: user.role || 'user'
            },
            access_token: token,
            token_type: 'bearer',
            expires_in: 604800 // 7 dias
        });

    } catch (error) {
        console.error('❌ [AUTH] Erro no login:', error.message);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message,
            code: 'INTERNAL_ERROR'
        });
    }
});

// Registro
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, name, tenant_id } = req.body;

        console.log('📝 [AUTH] Tentativa de registro:', email);

        // Verificar se usuário já existe
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Usuário já existe',
                message: 'User already registered',
                code: 'USER_EXISTS'
            });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 12);

        // Criar tenant se não fornecido
        let finalTenantId = tenant_id;
        if (!finalTenantId) {
            const tenantResult = await pool.query(
                `INSERT INTO tenants (name, slug, plan) 
                 VALUES ($1, $2, 'free') 
                 RETURNING id`,
                [name || email.split('@')[0], email.split('@')[0].toLowerCase()]
            );
            finalTenantId = tenantResult.rows[0].id;
        }

        // Criar usuário
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, name, tenant_id, role) 
             VALUES ($1, $2, $3, $4, 'admin') 
             RETURNING id, email, name, tenant_id, role`,
            [email, hashedPassword, name || email.split('@')[0], finalTenantId]
        );

        const user = result.rows[0];

        // Gerar JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                tenantId: user.tenant_id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ [AUTH] Registro bem-sucedido:', email);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tenant_id: user.tenant_id,
                role: user.role
            },
            access_token: token,
            token_type: 'bearer',
            expires_in: 604800
        });

    } catch (error) {
        console.error('❌ [AUTH] Erro no registro:', error.message);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message,
            code: 'INTERNAL_ERROR'
        });
    }
});

// Dados do usuário atual
app.get('/auth/user', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, name, tenant_id, role, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Usuário não encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('❌ [AUTH] Erro ao buscar usuário:', error.message);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Reset de senha (envia email - implementar depois)
app.post('/auth/reset-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Verificar se usuário existe
        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            // Não revelar se o email existe
            return res.json({ message: 'Se o email existir, você receberá instruções de reset' });
        }

        // TODO: Implementar envio de email
        console.log('📧 [AUTH] Reset de senha solicitado para:', email);
        
        res.json({ message: 'Se o email existir, você receberá instruções de reset' });
    } catch (error) {
        console.error('❌ [AUTH] Erro no reset:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==========================================
// REST GENÉRICO (estilo PostgREST/Supabase)
// ==========================================

// Lista de tabelas permitidas (segurança)
const ALLOWED_TABLES = [
    'users',
    'tenants', 
    'profiles',
    'customers',
    'whatsapp_instances',
    'whatsapp_messages_log',
    'tenant_settings',
    'chatbot_config',
    'chatbot_knowledge',
    'chatbot_conversations',
    'chatbot_messages',
    'financial_transactions',
    'financial_categories',
    'appointments',
    'appointment_services',
    'services',
    'products',
    'product_categories',
    'inventory_movements',
    'notifications',
    'audit_log',
    'api_keys',
    'integrations'
];

// Função para parsear filtros do Supabase
function parseFilters(query, tableName) {
    const filters = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(query)) {
        // Ignorar parâmetros especiais
        if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;

        // Parse de operadores: column=eq.value, column=gt.value, etc
        const match = String(value).match(/^(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd|not)\.(.*)$/);
        
        if (match) {
            const [, operator, val] = match;
            const column = key;
            
            switch (operator) {
                case 'eq':
                    filters.push(`"${column}" = $${valueIndex++}`);
                    values.push(val === 'null' ? null : val);
                    break;
                case 'neq':
                    filters.push(`"${column}" != $${valueIndex++}`);
                    values.push(val === 'null' ? null : val);
                    break;
                case 'gt':
                    filters.push(`"${column}" > $${valueIndex++}`);
                    values.push(val);
                    break;
                case 'gte':
                    filters.push(`"${column}" >= $${valueIndex++}`);
                    values.push(val);
                    break;
                case 'lt':
                    filters.push(`"${column}" < $${valueIndex++}`);
                    values.push(val);
                    break;
                case 'lte':
                    filters.push(`"${column}" <= $${valueIndex++}`);
                    values.push(val);
                    break;
                case 'like':
                    filters.push(`"${column}" LIKE $${valueIndex++}`);
                    values.push(val);
                    break;
                case 'ilike':
                    filters.push(`"${column}" ILIKE $${valueIndex++}`);
                    values.push(val);
                    break;
                case 'is':
                    if (val === 'null') {
                        filters.push(`"${column}" IS NULL`);
                    } else if (val === 'true') {
                        filters.push(`"${column}" IS TRUE`);
                    } else if (val === 'false') {
                        filters.push(`"${column}" IS FALSE`);
                    }
                    break;
                case 'in':
                    const inValues = val.replace(/[()]/g, '').split(',');
                    const placeholders = inValues.map(() => `$${valueIndex++}`).join(',');
                    filters.push(`"${column}" IN (${placeholders})`);
                    values.push(...inValues);
                    break;
                case 'not':
                    // not.eq.value, not.is.null, etc
                    const notMatch = val.match(/^(eq|is)\.(.*)$/);
                    if (notMatch) {
                        const [, notOp, notVal] = notMatch;
                        if (notOp === 'is' && notVal === 'null') {
                            filters.push(`"${column}" IS NOT NULL`);
                        } else if (notOp === 'eq') {
                            filters.push(`"${column}" != $${valueIndex++}`);
                            values.push(notVal);
                        }
                    }
                    break;
            }
        } else if (!key.startsWith('_')) {
            // Filtro simples: column=value (igualdade)
            filters.push(`"${key}" = $${valueIndex++}`);
            values.push(value);
        }
    }

    return { filters, values, nextIndex: valueIndex };
}

// Função para parsear ORDER
function parseOrder(orderStr) {
    if (!orderStr) return '';
    
    const parts = orderStr.split(',').map(part => {
        const [column, direction] = part.split('.');
        const dir = direction === 'desc' ? 'DESC' : 'ASC';
        return `"${column}" ${dir}`;
    });
    
    return `ORDER BY ${parts.join(', ')}`;
}

// GET - Listar/Buscar registros
app.get('/rest/v1/:table', optionalAuth, async (req, res) => {
    const { table } = req.params;
    
    // Validar tabela
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ 
            error: `Tabela '${table}' não permitida`,
            code: 'TABLE_NOT_ALLOWED'
        });
    }

    try {
        const { select, order, limit, offset } = req.query;
        
        // Colunas a selecionar
        const columns = select ? select.split(',').map(c => `"${c.trim()}"`).join(', ') : '*';
        
        // Parse de filtros
        const { filters, values } = parseFilters(req.query, table);
        
        // Adicionar filtro de tenant_id se autenticado e tabela tem tenant_id
        if (req.user && req.user.tenantId) {
            // Verificar se tabela tem coluna tenant_id
            const hasColumnResult = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'tenant_id'
            `, [table]);
            
            if (hasColumnResult.rows.length > 0) {
                filters.push(`"tenant_id" = $${values.length + 1}`);
                values.push(req.user.tenantId);
            }
        }
        
        // Montar query
        let sql = `SELECT ${columns} FROM "${table}"`;
        
        if (filters.length > 0) {
            sql += ` WHERE ${filters.join(' AND ')}`;
        }
        
        // ORDER BY
        if (order) {
            sql += ` ${parseOrder(order)}`;
        }
        
        // LIMIT e OFFSET
        if (limit) {
            sql += ` LIMIT ${parseInt(limit)}`;
        }
        if (offset) {
            sql += ` OFFSET ${parseInt(offset)}`;
        }

        console.log('🔍 [REST] Query:', sql, values);
        
        const result = await pool.query(sql, values);
        
        // Retornar como array (compatível com Supabase)
        res.json(result.rows);

    } catch (error) {
        console.error(`❌ [REST] Erro ao buscar ${table}:`, error.message);
        res.status(500).json({ 
            error: 'Erro ao buscar dados',
            message: error.message,
            code: 'QUERY_ERROR'
        });
    }
});

// POST - Criar registro(s)
app.post('/rest/v1/:table', authenticateToken, async (req, res) => {
    const { table } = req.params;
    
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ 
            error: `Tabela '${table}' não permitida`,
            code: 'TABLE_NOT_ALLOWED'
        });
    }

    try {
        const data = req.body;
        const prefer = req.headers['prefer'] || '';
        const returnData = prefer.includes('return=representation');
        
        // Suportar array ou objeto único
        const records = Array.isArray(data) ? data : [data];
        const results = [];

        for (const record of records) {
            // Adicionar tenant_id automaticamente
            if (req.user && req.user.tenantId && !record.tenant_id) {
                record.tenant_id = req.user.tenantId;
            }
            
            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            
            const sql = `
                INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;
            
            console.log('📝 [REST] Insert:', sql);
            
            const result = await pool.query(sql, values);
            results.push(result.rows[0]);
        }

        console.log(`✅ [REST] ${results.length} registro(s) criado(s) em ${table}`);
        
        if (returnData) {
            res.status(201).json(results.length === 1 ? results[0] : results);
        } else {
            res.status(201).json({ success: true, count: results.length });
        }

    } catch (error) {
        console.error(`❌ [REST] Erro ao inserir em ${table}:`, error.message);
        res.status(500).json({ 
            error: 'Erro ao inserir dados',
            message: error.message,
            code: 'INSERT_ERROR'
        });
    }
});

// PATCH - Atualizar registro(s)
app.patch('/rest/v1/:table', authenticateToken, async (req, res) => {
    const { table } = req.params;
    
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ 
            error: `Tabela '${table}' não permitida`,
            code: 'TABLE_NOT_ALLOWED'
        });
    }

    try {
        const data = req.body;
        const prefer = req.headers['prefer'] || '';
        const returnData = prefer.includes('return=representation');
        
        // Parse de filtros da query string
        const { filters, values: filterValues, nextIndex } = parseFilters(req.query, table);
        
        if (filters.length === 0) {
            return res.status(400).json({ 
                error: 'Filtro obrigatório para UPDATE',
                message: 'Você deve especificar ao menos um filtro',
                code: 'FILTER_REQUIRED'
            });
        }
        
        // Adicionar filtro de tenant_id
        if (req.user && req.user.tenantId) {
            const hasColumnResult = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'tenant_id'
            `, [table]);
            
            if (hasColumnResult.rows.length > 0) {
                filters.push(`"tenant_id" = $${nextIndex}`);
                filterValues.push(req.user.tenantId);
            }
        }
        
        // Montar SET
        const setColumns = Object.keys(data);
        const setValues = Object.values(data);
        const setClause = setColumns.map((col, i) => 
            `"${col}" = $${filterValues.length + i + 1}`
        ).join(', ');
        
        const allValues = [...filterValues, ...setValues];
        
        const sql = `
            UPDATE "${table}"
            SET ${setClause}
            WHERE ${filters.join(' AND ')}
            RETURNING *
        `;
        
        console.log('🔄 [REST] Update:', sql);
        
        const result = await pool.query(sql, allValues);
        
        console.log(`✅ [REST] ${result.rowCount} registro(s) atualizado(s) em ${table}`);
        
        if (returnData) {
            res.json(result.rows);
        } else {
            res.json({ success: true, count: result.rowCount });
        }

    } catch (error) {
        console.error(`❌ [REST] Erro ao atualizar ${table}:`, error.message);
        res.status(500).json({ 
            error: 'Erro ao atualizar dados',
            message: error.message,
            code: 'UPDATE_ERROR'
        });
    }
});

// DELETE - Remover registro(s)
app.delete('/rest/v1/:table', authenticateToken, async (req, res) => {
    const { table } = req.params;
    
    if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ 
            error: `Tabela '${table}' não permitida`,
            code: 'TABLE_NOT_ALLOWED'
        });
    }

    try {
        // Parse de filtros
        const { filters, values, nextIndex } = parseFilters(req.query, table);
        
        if (filters.length === 0) {
            return res.status(400).json({ 
                error: 'Filtro obrigatório para DELETE',
                message: 'Você deve especificar ao menos um filtro',
                code: 'FILTER_REQUIRED'
            });
        }
        
        // Adicionar filtro de tenant_id
        if (req.user && req.user.tenantId) {
            const hasColumnResult = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'tenant_id'
            `, [table]);
            
            if (hasColumnResult.rows.length > 0) {
                filters.push(`"tenant_id" = $${nextIndex}`);
                values.push(req.user.tenantId);
            }
        }
        
        const sql = `DELETE FROM "${table}" WHERE ${filters.join(' AND ')} RETURNING *`;
        
        console.log('🗑️ [REST] Delete:', sql);
        
        const result = await pool.query(sql, values);
        
        console.log(`✅ [REST] ${result.rowCount} registro(s) deletado(s) de ${table}`);
        
        res.json({ success: true, count: result.rowCount, deleted: result.rows });

    } catch (error) {
        console.error(`❌ [REST] Erro ao deletar de ${table}:`, error.message);
        res.status(500).json({ 
            error: 'Erro ao deletar dados',
            message: error.message,
            code: 'DELETE_ERROR'
        });
    }
});

// ==========================================
// RPC - FUNÇÕES DO BANCO
// ==========================================

// Endpoint genérico para RPC
app.post('/rpc/:function_name', optionalAuth, async (req, res) => {
    const { function_name } = req.params;
    const params = req.body;

    console.log(`🔧 [RPC] Chamando função: ${function_name}`);

    try {
        // Funções permitidas
        const ALLOWED_FUNCTIONS = [
            'get_dashboard_stats',
            'get_customer_stats',
            'get_financial_summary',
            'process_whatsapp_message',
            'create_appointment',
            'cancel_appointment',
            'get_available_slots',
            'send_notification'
        ];

        // Verificar se função é permitida (ou implementar inline)
        if (!ALLOWED_FUNCTIONS.includes(function_name)) {
            // Tentar chamar função SQL diretamente
            const paramNames = Object.keys(params);
            const paramValues = Object.values(params);
            const paramPlaceholders = paramNames.map((name, i) => `"${name}" := $${i + 1}`).join(', ');
            
            const sql = paramNames.length > 0 
                ? `SELECT * FROM ${function_name}(${paramPlaceholders})`
                : `SELECT * FROM ${function_name}()`;
            
            const result = await pool.query(sql, paramValues);
            return res.json(result.rows);
        }

        // Implementações inline de funções comuns
        switch (function_name) {
            case 'get_dashboard_stats':
                const tenantId = req.user?.tenantId;
                if (!tenantId) {
                    return res.status(401).json({ error: 'Autenticação necessária' });
                }
                
                const [customers, appointments, revenue] = await Promise.all([
                    pool.query('SELECT COUNT(*) FROM customers WHERE tenant_id = $1', [tenantId]),
                    pool.query('SELECT COUNT(*) FROM appointments WHERE tenant_id = $1 AND date >= CURRENT_DATE', [tenantId]),
                    pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE tenant_id = $1 AND type = $2 AND created_at >= date_trunc($3, CURRENT_DATE)', [tenantId, 'income', 'month'])
                ]);
                
                return res.json({
                    total_customers: parseInt(customers.rows[0].count),
                    upcoming_appointments: parseInt(appointments.rows[0].count),
                    monthly_revenue: parseFloat(revenue.rows[0].total)
                });

            default:
                return res.status(404).json({ 
                    error: `Função '${function_name}' não encontrada`,
                    code: 'FUNCTION_NOT_FOUND'
                });
        }

    } catch (error) {
        console.error(`❌ [RPC] Erro na função ${function_name}:`, error.message);
        res.status(500).json({ 
            error: 'Erro ao executar função',
            message: error.message,
            code: 'RPC_ERROR'
        });
    }
});

// ==========================================
// STORAGE (simulação básica)
// ==========================================

app.post('/storage/v1/object/:bucket/*', authenticateToken, (req, res) => {
    // TODO: Implementar upload de arquivos
    const { bucket } = req.params;
    const path = req.params[0];
    
    console.log(`📁 [STORAGE] Upload para ${bucket}/${path}`);
    
    res.json({ 
        Key: `${bucket}/${path}`,
        message: 'Storage não implementado ainda'
    });
});

app.get('/storage/v1/object/public/:bucket/*', (req, res) => {
    // TODO: Implementar download de arquivos públicos
    const { bucket } = req.params;
    const path = req.params[0];
    
    res.status(404).json({ 
        error: 'Arquivo não encontrado',
        message: 'Storage não implementado ainda'
    });
});

// ==========================================
// WEBHOOKS WHATSAPP
// ==========================================

// Webhook para API 1 (WAHA)
app.post('/api1/webhook', async (req, res) => {
    try {
        console.log('📥 [API1] Webhook recebido');

        const payload = req.body;

        // Salvar log da mensagem
        if (payload.event === 'message' && payload.data) {
            await pool.query(`
                INSERT INTO whatsapp_messages_log
                (tenant_id, instance_name, from_number, to_number, message_text, message_type, raw_payload, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, now())
            `, [
                'a0000000-0000-0000-0000-000000000000',
                'API_1_WAHA',
                payload.data.from || '',
                payload.data.to || '',
                payload.data.body || payload.data.text || '',
                payload.data.type || 'text',
                JSON.stringify(payload)
            ]);

            console.log('✅ [API1] Mensagem salva no banco');
        }

        res.json({ success: true });

    } catch (error) {
        console.error('❌ [API1] Erro no webhook:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Webhook para API 2 (Evolution)
app.post('/api2/webhook', async (req, res) => {
    try {
        console.log('📥 [API2] Webhook recebido');

        const payload = req.body;

        if (payload.event === 'messages.upsert' && payload.data) {
            const message = payload.data.messages?.[0] || payload.data;

            await pool.query(`
                INSERT INTO whatsapp_messages_log
                (tenant_id, instance_name, from_number, to_number, message_text, message_type, raw_payload, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, now())
            `, [
                'a0000000-0000-0000-0000-000000000000',
                'API_2_EVOLUTION',
                message.key?.remoteJid || '',
                payload.instance || '',
                message.message?.conversation || message.message?.extendedTextMessage?.text || '',
                'text',
                JSON.stringify(payload)
            ]);

            console.log('✅ [API2] Mensagem salva no banco');
        }

        res.json({ success: true });

    } catch (error) {
        console.error('❌ [API2] Erro no webhook:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// ENDPOINTS LEGADOS (compatibilidade)
// ==========================================

// Clientes (endpoint legado)
app.get('/customers', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM customers WHERE tenant_id = $1 ORDER BY created_at DESC',
            [req.user.tenantId]
        );
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/customers', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone, whatsapp_number } = req.body;
        const result = await pool.query(
            `INSERT INTO customers (tenant_id, name, email, phone, whatsapp_number) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.tenantId, name, email, phone, whatsapp_number]
        );
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// HEALTH E UTILITÁRIOS
// ==========================================

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'BR Gestor API - VPS Edition',
        version: '2.0.0',
        features: ['auth', 'rest', 'rpc', 'webhooks']
    });
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM whatsapp_instances');
        const tables = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' ORDER BY table_name
        `);
        
        res.json({
            success: true,
            database: 'connected',
            whatsapp_instances: result.rows[0].total,
            tables: tables.rows.map(r => r.table_name)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================

const PORT = process.env.API_PORT || 3333;

app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🎯 BR Gestor API rodando na porta ${PORT}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔗 URLs:');
    console.log(`   - Health:   http://localhost:${PORT}/health`);
    console.log(`   - Auth:     http://localhost:${PORT}/auth/login`);
    console.log(`   - REST:     http://localhost:${PORT}/rest/v1/{table}`);
    console.log(`   - RPC:      http://localhost:${PORT}/rpc/{function}`);
    console.log('═══════════════════════════════════════════════════════════════');
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
