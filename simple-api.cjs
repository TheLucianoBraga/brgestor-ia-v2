const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'brgestor_jwt_secret_2026_super_secure';

// ============================================
// POSTGRESQL - VPS (Infraestrutura Independente)
// ============================================
const pool = new Pool({
    host: '72.60.14.172',
    port: 5433,
    database: 'brgestor',
    user: 'brgestor_user',
    password: 'Manu07062022',
    ssl: false,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10
});

// Testar conexão ao iniciar
pool.query('SELECT NOW()')
    .then(() => console.log('✅ PostgreSQL VPS conectado com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar PostgreSQL:', err.message));

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info', 'Prefer']
}));

app.use(express.json());

// Middleware para extrair usuário do JWT
const authenticateToken = (req, res, next) => {
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
app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as time');
        res.json({ 
            status: 'ok', 
            database: 'connected',
            timestamp: result.rows[0].time 
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'error', 
            database: 'disconnected',
            error: err.message 
        });
    }
});

// ============================================
// AUTH - LOGIN
// ============================================
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        console.log('🔑 Login attempt:', email);
        console.log('🔍 Looking for user with email:', email.toLowerCase());
        
        // Buscar usuário no banco
        const result = await pool.query(
            'SELECT id, email, encrypted_password, raw_user_meta_data FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        console.log('📊 Query result:', result.rows.length, 'users found');
        
        if (result.rows.length === 0) {
            console.log('❌ No user found with email:', email.toLowerCase());
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const user = result.rows[0];
        
        // Verificar senha - tentar bcrypt primeiro, fallback para texto simples
        let validPassword = false;
        try {
            validPassword = await bcrypt.compare(password, user.encrypted_password);
        } catch (err) {
            // Fallback: comparação direta para senhas simples (temporário)
            validPassword = password === user.encrypted_password;
            console.log('⚠️ Using plain text password comparison (temporary)');
        }
        
        console.log('🔐 Password check result:', validPassword);
        
        if (!validPassword) {
            console.log('❌ Invalid password for user:', email);
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
        
        console.log('✅ Login successful:', email);
        
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

// ============================================
// AUTH - SIGNUP
// ============================================
app.post('/auth/signup', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        
        // Verificar se usuário existe
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }
        
        // Criar usuário
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = require('crypto').randomUUID();
        
        await pool.query(
            `INSERT INTO users (id, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [userId, email.toLowerCase(), hashedPassword, JSON.stringify({ full_name: fullName })]
        );
        
        console.log('✅ User created:', email);
        
        res.json({ success: true, user: { id: userId, email } });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// REST API - Generic Table Access
// ============================================
const parseFilters = (query) => {
    const filters = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(query)) {
        if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
        
        // Parse PostgREST-style filters
        const match = value.match(/^(eq|neq|gt|gte|lt|lte|like|ilike|in|is)\.(.+)$/);
        if (match) {
            const [, op, val] = match;
            const operators = {
                eq: '=', neq: '!=', gt: '>', gte: '>=',
                lt: '<', lte: '<=', like: 'LIKE', ilike: 'ILIKE',
                in: 'IN', is: 'IS'
            };
            
            if (op === 'in') {
                const inValues = val.replace(/[()]/g, '').split(',');
                const placeholders = inValues.map(() => `$${paramIndex++}`).join(',');
                filters.push(`${key} IN (${placeholders})`);
                values.push(...inValues);
            } else if (op === 'is') {
                filters.push(`${key} IS ${val.toUpperCase()}`);
            } else {
                filters.push(`${key} ${operators[op]} $${paramIndex++}`);
                values.push(val);
            }
        }
    }
    
    return { filters, values };
};

app.get('/rest/v1/:table', async (req, res) => {
    const { table } = req.params;
    
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
        
        console.log(`📋 GET /rest/v1/${table}:`, sql);
        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error(`GET /rest/v1/${table} error:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// RPC - Function Calls (substituir mocks)
// ============================================
app.post('/rest/v1/rpc/:function', async (req, res) => {
    const { function: funcName } = req.params;
    const params = req.body;
    
    try {
        // Implementações específicas para substituir mocks
        switch (funcName) {
            case 'get_master_signup_ref_code':
                // Retornar códigos de referência master
                const refCodes = await pool.query(`
                    SELECT code::text as ref_code 
                    FROM ref_codes 
                    WHERE kind = 'master_signup' AND active = true
                    LIMIT 10
                `);
                return res.json(refCodes.rows.map(r => r.ref_code));
                
            case 'authenticate_customer':
                // Autenticar cliente
                const { email, password } = params;
                const customer = await pool.query(`
                    SELECT id, email, raw_user_meta_data->>'name' as name, 
                           raw_user_meta_data->>'tenant_id' as tenant_id
                    FROM users 
                    WHERE email = $1 AND encrypted_password = crypt($2, encrypted_password)
                `, [email, password]);
                
                if (customer.rows.length > 0) {
                    const customerData = customer.rows[0];
                    return res.json([{
                        success: true,
                        customer_id: customerData.id,
                        customer_name: customerData.name || customerData.email,
                        tenant_id: customerData.tenant_id,
                        email: customerData.email
                    }]);
                } else {
                    return res.status(401).json([{ success: false, error: 'Invalid credentials' }]);
                }
                
            case 'get_current_tenant_access':
                // Verificar acesso do tenant
                const tenantAccess = await pool.query(`
                    SELECT type, status 
                    FROM tenants 
                    WHERE id = $1 AND status = 'active'
                `, [params.tenant_id || 'a0000000-0000-0000-0000-000000000000']);
                
                if (tenantAccess.rows.length > 0) {
                    const tenant = tenantAccess.rows[0];
                    return res.json([{ 
                        has_access: true, 
                        tenant_type: tenant.type === 'master' ? 'adm' : tenant.type 
                    }]);
                } else {
                    return res.json([{ has_access: false, tenant_type: null }]);
                }
                
            case 'customer_has_active_service':
                // Verificar se cliente tem serviço ativo
                return res.json([true]); // Simplificado por ora
                
            case 'set_current_tenant':
                // Configurar tenant atual
                return res.json([{ success: true }]);
                
            case 'admin_complete_master_setup':
                // Completar setup master
                await pool.query(`
                    INSERT INTO tenant_settings (tenant_id, key, value)
                    VALUES ($1, 'master_setup_complete', 'true')
                    ON CONFLICT (tenant_id, key) DO UPDATE SET 
                        value = 'true', updated_at = now()
                `, [params.tenant_id || 'a0000000-0000-0000-0000-000000000000']);
                
                return res.json([{ success: true, message: 'Master setup complete' }]);
                
            case 'validate_ref_code':
                // Validar código de referência
                const refValidation = await pool.query(`
                    SELECT active, payload 
                    FROM ref_codes 
                    WHERE code = $1::bigint
                `, [params.ref_code]);
                
                if (refValidation.rows.length > 0 && refValidation.rows[0].active) {
                    return res.json([{ is_valid: true }]);
                } else {
                    return res.json([{ is_valid: false }]);
                }
                
            case 'ai_generate':
                // IA - resposta simplificada 
                return res.json([{ 
                    response: 'Esta funcionalidade requer integração com IA real. Configure a Gemini API key.' 
                }]);
                
            default:
                // Para funções não implementadas, retornar erro claro
                return res.status(404).json({ 
                    error: `RPC function '${funcName}' not implemented in PostgreSQL backend`,
                    hint: 'This function needs to be implemented to replace Supabase mock'
                });
        }
    } catch (err) {
        console.error(`RPC /${funcName} error:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Alias para /rpc/:function
app.post('/rpc/:function', async (req, res) => {
    req.url = `/rest/v1/rpc/${req.params.function}`;
    app.handle(req, res);
});

// ============================================
// ADMIN ENDPOINTS - Database Schema
// ============================================
app.get('/admin/tables', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT table_name, table_schema
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        res.json({ tables: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/admin/table/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
        `, [tableName]);
        res.json({ table: tableName, columns: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MIGRATION ENDPOINTS
// ============================================
app.post('/admin/execute-sql', async (req, res) => {
    try {
        const { sql } = req.body;
        if (!sql) {
            return res.status(400).json({ error: 'SQL is required' });
        }
        
        console.log('🗄️ Executing SQL:', sql.substring(0, 200) + '...');
        const result = await pool.query(sql);
        res.json({ 
            success: true, 
            rowCount: result.rowCount,
            rows: result.rows 
        });
    } catch (err) {
        console.error('SQL Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BRGestor API rodando na porta ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🔌 Database: PostgreSQL @ 72.60.14.172:5433`);
});