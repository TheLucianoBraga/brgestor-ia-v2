const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://72.60.14.172', 'https://brgestor.app'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Middleware de log global
app.use((req, res, next) => {
    console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Config do banco
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: 'brgestor',
    user: process.env.DB_USER || 'brgestor_user',
    password: process.env.DB_PASSWORD || 'Manu07062022'
});

const JWT_SECRET = process.env.JWT_SECRET || 'brgestor-jwt-secret-2026';

// Teste conexão
pool.connect((err, client, release) => {
    if (err) console.error('❌ [DB] Erro:', err.message);
    else { console.log('✅ [DB] Conectado!'); release(); }
});

// ==========================================
// MIDDLEWARE JWT
// ==========================================
const auth = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch { return res.status(403).json({ error: 'Token inválido' }); }
};

// Helper para resposta padronizada
const ok = (res, data) => res.json({ data, error: null });
const err = (res, msg, code = 500) => res.status(code).json({ data: null, error: msg });

// ==========================================
// AUTH
// ==========================================
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (!result.rows[0]) return err(res, 'Credenciais inválidas', 401);
        
        const user = result.rows[0];
        if (!await bcrypt.compare(password, user.password_hash)) return err(res, 'Credenciais inválidas', 401);
        
        const token = jwt.sign({ userId: user.id, email: user.email, tenantId: user.tenant_id }, JWT_SECRET, { expiresIn: '24h' });
        console.log('✅ [AUTH] Login:', email);
        
        ok(res, { user: { id: user.id, email: user.email, name: user.name, tenant_id: user.tenant_id }, access_token: token, expires_in: 86400 });
    } catch (e) { console.error('❌ [AUTH]', e.message); err(res, 'Erro no login'); }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (exists.rows[0]) return err(res, 'Usuário já existe', 400);
        
        const hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name, tenant_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name, tenant_id',
            [email, hash, name, 'a0000000-0000-0000-0000-000000000000']
        );
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id, email: user.email, tenantId: user.tenant_id }, JWT_SECRET, { expiresIn: '24h' });
        
        console.log('✅ [AUTH] Registro:', email);
        ok(res, { user, access_token: token, expires_in: 86400 });
    } catch (e) { console.error('❌ [AUTH]', e.message); err(res, 'Erro no registro'); }
});

app.get('/auth/user', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, name, tenant_id FROM users WHERE id = $1', [req.user.userId]);
        if (!result.rows[0]) return err(res, 'Usuário não encontrado', 404);
        ok(res, { user: result.rows[0] });
    } catch (e) { err(res, 'Erro ao buscar usuário'); }
});

app.post('/auth/signup/referral-code', async (req, res) => {
    try {
        ok(res, { ref_code: 'BRGESTOR2026' });
    } catch (e) { err(res, 'Erro ao buscar código'); }
});

// ==========================================
// CUSTOMERS
// ==========================================
app.get('/api/customers', auth, async (req, res) => {
    try {
        const { limit = 100, offset = 0, search, customer_tenant_id } = req.query;
        let sql = 'SELECT * FROM customers WHERE tenant_id = $1';
        const params = [req.user.tenantId];
        let idx = 2;
        
        if (customer_tenant_id) { sql += ` AND customer_tenant_id = $${idx++}`; params.push(customer_tenant_id); }
        if (search) { sql += ` AND (full_name ILIKE $${idx} OR email ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        
        sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(sql, params);
        ok(res, result.rows);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao listar clientes'); }
});

app.get('/api/customers/:id', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenantId]);
        if (!result.rows[0]) return err(res, 'Cliente não encontrado', 404);
        ok(res, result.rows[0]);
    } catch (e) { err(res, 'Erro ao buscar cliente'); }
});

app.post('/api/customers', auth, async (req, res) => {
    try {
        const { full_name, email, phone, whatsapp_number, document_number, customer_tenant_id } = req.body;
        const result = await pool.query(
            `INSERT INTO customers (tenant_id, full_name, email, phone, whatsapp_number, document_number, customer_tenant_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.user.tenantId, full_name, email, phone, whatsapp_number, document_number, customer_tenant_id]
        );
        console.log('✅ Cliente criado:', full_name);
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar cliente'); }
});

app.patch('/api/customers/:id', auth, async (req, res) => {
    try {
        const fields = Object.keys(req.body).filter(k => ['full_name','email','phone','whatsapp_number','document_number'].includes(k));
        if (!fields.length) return err(res, 'Nenhum campo para atualizar', 400);
        
        const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = fields.map(f => req.body[f]);
        values.push(req.params.id, req.user.tenantId);
        
        const result = await pool.query(
            `UPDATE customers SET ${sets}, updated_at = now() WHERE id = $${fields.length + 1} AND tenant_id = $${fields.length + 2} RETURNING *`,
            values
        );
        if (!result.rows[0]) return err(res, 'Cliente não encontrado', 404);
        ok(res, result.rows[0]);
    } catch (e) { err(res, 'Erro ao atualizar cliente'); }
});

app.delete('/api/customers/:id', auth, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM customers WHERE id = $1 AND tenant_id = $2 RETURNING id', [req.params.id, req.user.tenantId]);
        if (!result.rows[0]) return err(res, 'Cliente não encontrado', 404);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar cliente'); }
});

app.get('/api/customers/:id/auth', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customer_auth WHERE customer_id = $1', [req.params.id]);
        ok(res, result.rows[0] || null);
    } catch (e) { err(res, 'Erro ao buscar auth'); }
});

app.delete('/api/customers/:id/addresses', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM customer_addresses WHERE customer_id = $1', [req.params.id]);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar endereços'); }
});

app.delete('/api/customers/:id/vehicles', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM customer_vehicles WHERE customer_id = $1', [req.params.id]);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar veículos'); }
});

app.delete('/api/customers/:id/items', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM customer_items WHERE customer_id = $1', [req.params.id]);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar itens'); }
});

// ==========================================
// CHARGES (cobranças)
// ==========================================
app.get('/api/charges', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, cu.full_name as customer_name 
            FROM customer_charges c 
            LEFT JOIN customers cu ON c.customer_id = cu.id
            WHERE c.tenant_id = $1 
            ORDER BY c.due_date DESC
        `, [req.user.tenantId]);
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar cobranças'); }
});

app.get('/api/customers/:id/charges', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM customer_charges WHERE customer_id = $1 AND tenant_id = $2 ORDER BY due_date DESC',
            [req.params.id, req.user.tenantId]
        );
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar cobranças'); }
});

app.post('/api/charges', auth, async (req, res) => {
    try {
        const { customer_id, amount, due_date, description, status = 'pending' } = req.body;
        const result = await pool.query(
            `INSERT INTO customer_charges (tenant_id, customer_id, amount, due_date, description, status) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user.tenantId, customer_id, amount, due_date, description, status]
        );
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar cobrança'); }
});

app.patch('/api/charges/:id', auth, async (req, res) => {
    try {
        const { status, paid_at, amount, due_date, description } = req.body;
        const result = await pool.query(`
            UPDATE customer_charges 
            SET status = COALESCE($1, status), paid_at = COALESCE($2, paid_at), 
                amount = COALESCE($3, amount), due_date = COALESCE($4, due_date),
                description = COALESCE($5, description), updated_at = now()
            WHERE id = $6 AND tenant_id = $7 RETURNING *
        `, [status, paid_at, amount, due_date, description, req.params.id, req.user.tenantId]);
        if (!result.rows[0]) return err(res, 'Cobrança não encontrada', 404);
        ok(res, result.rows[0]);
    } catch (e) { err(res, 'Erro ao atualizar cobrança'); }
});

app.delete('/api/charges/:id', auth, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM customer_charges WHERE id = $1 AND tenant_id = $2 RETURNING id', [req.params.id, req.user.tenantId]);
        if (!result.rows[0]) return err(res, 'Cobrança não encontrada', 404);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar cobrança'); }
});

// ==========================================
// COUPONS
// ==========================================
app.get('/api/coupons', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM coupons WHERE issuer_tenant_id = $1 ORDER BY created_at DESC',
            [req.user.tenantId]
        );
        const couponIds = result.rows.map(c => c.id);
        let redemptionCounts = {};
        if (couponIds.length) {
            const countResult = await pool.query(
                `SELECT coupon_id, COUNT(*) as count FROM coupon_redemptions WHERE coupon_id = ANY($1) GROUP BY coupon_id`,
                [couponIds]
            );
            redemptionCounts = Object.fromEntries(countResult.rows.map(r => [r.coupon_id, parseInt(r.count)]));
        }
        const data = result.rows.map(c => ({ ...c, redemption_count: redemptionCounts[c.id] || 0 }));
        ok(res, data);
    } catch (e) { err(res, 'Erro ao listar cupons'); }
});

app.post('/api/coupons', auth, async (req, res) => {
    try {
        const { code, discount_type, discount_value, max_uses, expires_at, active = true } = req.body;
        const result = await pool.query(
            `INSERT INTO coupons (issuer_tenant_id, code, discount_type, discount_value, max_uses, expires_at, active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.user.tenantId, code, discount_type, discount_value, max_uses, expires_at, active]
        );
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar cupom'); }
});

app.patch('/api/coupons/:id', auth, async (req, res) => {
    try {
        const { code, discount_type, discount_value, max_uses, expires_at, active } = req.body;
        const result = await pool.query(`
            UPDATE coupons 
            SET code = COALESCE($1, code), discount_type = COALESCE($2, discount_type),
                discount_value = COALESCE($3, discount_value), max_uses = COALESCE($4, max_uses),
                expires_at = COALESCE($5, expires_at), active = COALESCE($6, active), updated_at = now()
            WHERE id = $7 AND issuer_tenant_id = $8 RETURNING *
        `, [code, discount_type, discount_value, max_uses, expires_at, active, req.params.id, req.user.tenantId]);
        if (!result.rows[0]) return err(res, 'Cupom não encontrado', 404);
        ok(res, result.rows[0]);
    } catch (e) { err(res, 'Erro ao atualizar cupom'); }
});

app.delete('/api/coupons/:id', auth, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM coupons WHERE id = $1 AND issuer_tenant_id = $2 RETURNING id', [req.params.id, req.user.tenantId]);
        if (!result.rows[0]) return err(res, 'Cupom não encontrado', 404);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar cupom'); }
});

app.get('/api/coupons/:id/redemptions', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM coupon_redemptions WHERE coupon_id = $1 ORDER BY created_at DESC', [req.params.id]);
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar redemptions'); }
});

// ==========================================
// ACTIVITY LOGS
// ==========================================
app.get('/api/activity-logs', auth, async (req, res) => {
    try {
        const { limit = 50, offset = 0, action, resource, start_date, end_date } = req.query;
        let sql = 'SELECT * FROM activity_logs WHERE tenant_id = $1';
        const params = [req.user.tenantId];
        let idx = 2;
        
        if (action) { sql += ` AND action = $${idx++}`; params.push(action); }
        if (resource) { sql += ` AND resource = $${idx++}`; params.push(resource); }
        if (start_date) { sql += ` AND created_at >= $${idx++}`; params.push(start_date); }
        if (end_date) { sql += ` AND created_at <= $${idx++}`; params.push(end_date); }
        
        sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(sql, params);
        const countResult = await pool.query('SELECT COUNT(*) FROM activity_logs WHERE tenant_id = $1', [req.user.tenantId]);
        
        ok(res, { logs: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (e) { err(res, 'Erro ao listar logs'); }
});

app.post('/api/activity-logs', auth, async (req, res) => {
    try {
        const { action, resource, resource_id, details, user_id } = req.body;
        const result = await pool.query(
            `INSERT INTO activity_logs (tenant_id, user_id, action, resource, resource_id, details) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [req.user.tenantId, user_id || req.user.userId, action, resource, resource_id, details]
        );
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar log'); }
});

app.get('/api/activity-logs/actions', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT action FROM activity_logs WHERE tenant_id = $1 ORDER BY action', [req.user.tenantId]);
        ok(res, result.rows.map(r => r.action));
    } catch (e) { err(res, 'Erro ao listar actions'); }
});

app.get('/api/activity-logs/resources', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT resource FROM activity_logs WHERE tenant_id = $1 ORDER BY resource', [req.user.tenantId]);
        ok(res, result.rows.map(r => r.resource));
    } catch (e) { err(res, 'Erro ao listar resources'); }
});

// ==========================================
// PLANS
// ==========================================
app.get('/api/plans', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM plans WHERE active = true ORDER BY base_price ASC');
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar planos'); }
});

app.post('/api/plans', auth, async (req, res) => {
    try {
        const { name, plan_type, max_users, base_price, description } = req.body;
        const result = await pool.query(
            `INSERT INTO plans (name, plan_type, max_users, base_price, description, active) 
             VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
            [name, plan_type, max_users, base_price, description]
        );
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar plano'); }
});

app.patch('/api/plans/:id', auth, async (req, res) => {
    try {
        const { name, plan_type, max_users, base_price, description, active } = req.body;
        const result = await pool.query(`
            UPDATE plans 
            SET name = COALESCE($1, name), plan_type = COALESCE($2, plan_type),
                max_users = COALESCE($3, max_users), base_price = COALESCE($4, base_price),
                description = COALESCE($5, description), active = COALESCE($6, active), updated_at = now()
            WHERE id = $7 RETURNING *
        `, [name, plan_type, max_users, base_price, description, active, req.params.id]);
        if (!result.rows[0]) return err(res, 'Plano não encontrado', 404);
        ok(res, result.rows[0]);
    } catch (e) { err(res, 'Erro ao atualizar plano'); }
});

app.delete('/api/plans/:id', auth, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM plans WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) return err(res, 'Plano não encontrado', 404);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar plano'); }
});

// Plan Prices
app.get('/api/plans/:id/prices', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM plan_prices WHERE plan_id = $1 AND active = true', [req.params.id]);
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar preços'); }
});

app.get('/api/prices', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM plan_prices WHERE active = true');
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar preços'); }
});

app.post('/api/plans/:id/prices', auth, async (req, res) => {
    try {
        const { price, billing_cycle, seller_tenant_id } = req.body;
        const result = await pool.query(
            `INSERT INTO plan_prices (plan_id, price, billing_cycle, seller_tenant_id, active) 
             VALUES ($1, $2, $3, $4, true) RETURNING *`,
            [req.params.id, price, billing_cycle, seller_tenant_id || req.user.tenantId]
        );
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar preço'); }
});

app.patch('/api/prices/:id', auth, async (req, res) => {
    try {
        const { price, billing_cycle, active } = req.body;
        const result = await pool.query(`
            UPDATE plan_prices SET price = COALESCE($1, price), billing_cycle = COALESCE($2, billing_cycle),
                active = COALESCE($3, active), updated_at = now() WHERE id = $4 RETURNING *
        `, [price, billing_cycle, active, req.params.id]);
        if (!result.rows[0]) return err(res, 'Preço não encontrado', 404);
        ok(res, result.rows[0]);
    } catch (e) { err(res, 'Erro ao atualizar preço'); }
});

// Plan Features
app.get('/api/plans/:id/features', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM plan_features WHERE plan_id = $1 AND is_enabled = true', [req.params.id]);
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar features'); }
});

app.get('/api/features', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM plan_features WHERE is_enabled = true');
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar features'); }
});

app.post('/api/plans/:id/features', auth, async (req, res) => {
    try {
        const features = Array.isArray(req.body) ? req.body : [req.body];
        const results = [];
        for (const f of features) {
            const { feature_key, feature_value, is_enabled = true } = f;
            const result = await pool.query(
                `INSERT INTO plan_features (plan_id, feature_key, feature_value, is_enabled) VALUES ($1, $2, $3, $4) RETURNING *`,
                [req.params.id, feature_key, feature_value, is_enabled]
            );
            results.push(result.rows[0]);
        }
        ok(res, results);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar features'); }
});

app.delete('/api/features/:id', auth, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM plan_features WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) return err(res, 'Feature não encontrada', 404);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar feature'); }
});

app.delete('/api/plans/:id/features', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM plan_features WHERE plan_id = $1', [req.params.id]);
        ok(res, { deleted: true });
    } catch (e) { err(res, 'Erro ao deletar features'); }
});

// ==========================================
// TENANT SETTINGS
// ==========================================
app.get('/api/tenant-settings', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tenant_settings WHERE tenant_id = $1', [req.user.tenantId]);
        if (!result.rows.length) {
            return ok(res, [{ tenant_id: req.user.tenantId, whatsapp_enabled: true, chatbot_enabled: false, api_provider: 'waha' }]);
        }
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao buscar settings'); }
});

app.post('/api/tenant-settings', auth, async (req, res) => {
    try {
        const { key, value } = req.body;
        const result = await pool.query(`
            INSERT INTO tenant_settings (tenant_id, key, value) VALUES ($1, $2, $3)
            ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3, updated_at = now()
            RETURNING *
        `, [req.user.tenantId, key, value]);
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao salvar setting'); }
});

app.post('/api/tenant-settings/batch', auth, async (req, res) => {
    try {
        const settings = Array.isArray(req.body) ? req.body : [req.body];
        const results = [];
        for (const s of settings) {
            const { key, value } = s;
            const result = await pool.query(`
                INSERT INTO tenant_settings (tenant_id, key, value) VALUES ($1, $2, $3)
                ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3, updated_at = now()
                RETURNING *
            `, [req.user.tenantId, key, value]);
            results.push(result.rows[0]);
        }
        ok(res, results);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao salvar settings'); }
});

// ==========================================
// REFERRALS
// ==========================================
app.get('/api/referrals/links', auth, async (req, res) => {
    try {
        const { customer_id, is_active } = req.query;
        let sql = 'SELECT * FROM customer_referral_links WHERE 1=1';
        const params = [];
        let idx = 1;
        
        if (customer_id) { sql += ` AND customer_id = $${idx++}`; params.push(customer_id); }
        if (is_active !== undefined) { sql += ` AND is_active = $${idx++}`; params.push(is_active === 'true'); }
        
        sql += ' ORDER BY created_at DESC';
        const result = await pool.query(sql, params);
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar links'); }
});

app.post('/api/referrals/links', auth, async (req, res) => {
    try {
        const { customer_id, code, commission_rate, is_active = true } = req.body;
        const result = await pool.query(
            `INSERT INTO customer_referral_links (customer_id, code, commission_rate, is_active) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [customer_id, code || `REF${Date.now()}`, commission_rate, is_active]
        );
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar link'); }
});

app.patch('/api/referrals/links/:id', auth, async (req, res) => {
    try {
        const { commission_rate, is_active, total_earned, total_referrals } = req.body;
        const result = await pool.query(`
            UPDATE customer_referral_links 
            SET commission_rate = COALESCE($1, commission_rate), is_active = COALESCE($2, is_active),
                total_earned = COALESCE($3, total_earned), total_referrals = COALESCE($4, total_referrals),
                updated_at = now()
            WHERE id = $5 RETURNING *
        `, [commission_rate, is_active, total_earned, total_referrals, req.params.id]);
        if (!result.rows[0]) return err(res, 'Link não encontrado', 404);
        ok(res, result.rows[0]);
    } catch (e) { err(res, 'Erro ao atualizar link'); }
});

app.get('/api/referrals', auth, async (req, res) => {
    try {
        const { referral_link_id } = req.query;
        let sql = 'SELECT r.*, c.full_name as referred_customer_name FROM customer_referrals r LEFT JOIN customers c ON r.referred_customer_id = c.id WHERE 1=1';
        const params = [];
        
        if (referral_link_id) { sql += ' AND r.referral_link_id = $1'; params.push(referral_link_id); }
        
        sql += ' ORDER BY r.created_at DESC';
        const result = await pool.query(sql, params);
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar referrals'); }
});

app.get('/api/referrals/transactions', auth, async (req, res) => {
    try {
        const { referral_link_id } = req.query;
        let sql = 'SELECT * FROM referral_transactions WHERE 1=1';
        const params = [];
        
        if (referral_link_id) { sql += ' AND customer_referral_link_id = $1'; params.push(referral_link_id); }
        
        sql += ' ORDER BY created_at DESC';
        const result = await pool.query(sql, params);
        ok(res, result.rows);
    } catch (e) { err(res, 'Erro ao listar transactions'); }
});

app.post('/api/referrals/transactions', auth, async (req, res) => {
    try {
        const { customer_referral_link_id, amount, type, description, status = 'pending' } = req.body;
        const result = await pool.query(
            `INSERT INTO referral_transactions (customer_referral_link_id, amount, type, description, status) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [customer_referral_link_id, amount, type, description, status]
        );
        ok(res, result.rows[0]);
    } catch (e) { console.error('❌', e.message); err(res, 'Erro ao criar transaction'); }
});

// ==========================================
// CHATBOT CONFIG
// ==========================================
app.get('/api/chatbot-config', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chatbot_config WHERE tenant_id = $1 LIMIT 1', [req.user.tenantId]);
        if (!result.rows[0]) {
            return ok(res, { tenant_id: req.user.tenantId, enabled: false, welcome_message: 'Olá!', fallback_message: 'Não entendi.' });
        }
        ok(res, result.rows[0]);
    } catch (e) { err(res, 'Erro ao buscar config'); }
});

// ==========================================
// WEBHOOKS
// ==========================================
app.post('/api1/webhook', async (req, res) => {
    try {
        console.log('📥 [API1] Webhook:', JSON.stringify(req.body).slice(0, 200));
        const payload = req.body;
        
        if (payload.event === 'message' && payload.data) {
            await pool.query(`
                INSERT INTO whatsapp_messages_log (tenant_id, instance_name, from_number, to_number, message_text, message_type, raw_payload)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['a0000000-0000-0000-0000-000000000000', 'API_1_WAHA', payload.data.from || '', payload.data.to || '',
                payload.data.body || payload.data.text || '', payload.data.type || 'text', JSON.stringify(payload)]);
        }
        res.json({ success: true });
    } catch (e) { console.error('❌', e.message); res.status(500).json({ success: false }); }
});

app.post('/api2/webhook', async (req, res) => {
    try {
        console.log('📥 [API2] Webhook:', JSON.stringify(req.body).slice(0, 200));
        const payload = req.body;
        
        if (payload.event === 'messages.upsert' && payload.data) {
            const msg = payload.data.messages?.[0] || payload.data;
            await pool.query(`
                INSERT INTO whatsapp_messages_log (tenant_id, instance_name, from_number, to_number, message_text, message_type, raw_payload)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['a0000000-0000-0000-0000-000000000000', 'API_2_EVOLUTION', msg.key?.remoteJid || '', payload.instance || '',
                msg.message?.conversation || msg.message?.extendedTextMessage?.text || '', 'text', JSON.stringify(payload)]);
        }
        res.json({ success: true });
    } catch (e) { console.error('❌', e.message); res.status(500).json({ success: false }); }
});

// ==========================================
// HEALTH
// ==========================================
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'BR Gestor API v2' });
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM whatsapp_instances');
        res.json({ success: true, instances: result.rows[0].total });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ==========================================
// START
// ==========================================
const PORT = process.env.API_PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BR Gestor API v2 - Porta ${PORT}`);
    console.log('📡 Endpoints: /api/customers, /api/charges, /api/coupons, /api/plans, /api/activity-logs, /api/tenant-settings, /api/referrals');
});

process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
