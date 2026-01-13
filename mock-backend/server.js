const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Log middleware
app.use((req, res, next) => {
  console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== MOCK DATA ====================
const db = {
  users: [{ id: 'user-1', email: 'admin@test.com', password_hash: '123456', name: 'Admin', tenant_id: 'tenant-1' }],
  customers: [],
  charges: [],
  coupons: [],
  coupon_redemptions: [],
  activity_logs: [],
  plans: [
    { id: 'plan-1', name: 'Básico', plan_type: 'adm', base_price: 29.90, max_users: 1, active: true },
    { id: 'plan-2', name: 'Profissional', plan_type: 'adm', base_price: 99.90, max_users: 5, active: true },
    { id: 'plan-3', name: 'Revenda', plan_type: 'revenda', base_price: 199.90, max_users: 10, active: true },
  ],
  plan_prices: [],
  plan_features: [],
  tenant_settings: [],
  referral_links: [],
  referrals: [],
  referral_transactions: [],
};

const ok = (res, data) => res.json({ data, error: null });
const err = (res, msg, code = 500) => res.status(code).json({ data: null, error: msg });

// Auth middleware mock
const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return err(res, 'Token requerido', 401);
  req.user = { userId: 'user-1', tenantId: 'tenant-1', email: 'admin@test.com' };
  next();
};

// ==================== AUTH ====================
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || user.password_hash !== password) return err(res, 'Credenciais inválidas', 401);
  ok(res, { user: { id: user.id, email: user.email, name: user.name, tenant_id: user.tenant_id }, access_token: 'mock-token', expires_in: 86400 });
});

app.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (db.users.find(u => u.email === email)) return err(res, 'Usuário já existe', 400);
  const user = { id: `user-${Date.now()}`, email, password_hash: password, name, tenant_id: 'tenant-1' };
  db.users.push(user);
  ok(res, { user: { id: user.id, email: user.email, name: user.name, tenant_id: user.tenant_id }, access_token: 'mock-token', expires_in: 86400 });
});

app.get('/auth/user', auth, (req, res) => {
  const user = db.users.find(u => u.id === req.user.userId);
  ok(res, { user: user ? { id: user.id, email: user.email, name: user.name, tenant_id: user.tenant_id } : null });
});

app.post('/auth/signup/referral-code', (req, res) => ok(res, { ref_code: 'BRGESTOR2026' }));

// ==================== CUSTOMERS ====================
app.get('/api/customers', auth, (req, res) => {
  let data = db.customers.filter(c => c.tenant_id === req.user.tenantId);
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    data = data.filter(c => c.full_name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s));
  }
  if (req.query.customer_tenant_id) data = data.filter(c => c.customer_tenant_id === req.query.customer_tenant_id);
  ok(res, data);
});

app.get('/api/customers/:id', auth, (req, res) => {
  const c = db.customers.find(c => c.id === req.params.id);
  c ? ok(res, c) : err(res, 'Não encontrado', 404);
});

app.post('/api/customers', auth, (req, res) => {
  const c = { id: `cust-${Date.now()}`, tenant_id: req.user.tenantId, created_at: new Date().toISOString(), ...req.body };
  db.customers.push(c);
  ok(res, c);
});

app.patch('/api/customers/:id', auth, (req, res) => {
  const idx = db.customers.findIndex(c => c.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.customers[idx] = { ...db.customers[idx], ...req.body, updated_at: new Date().toISOString() };
  ok(res, db.customers[idx]);
});

app.delete('/api/customers/:id', auth, (req, res) => {
  const idx = db.customers.findIndex(c => c.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.customers.splice(idx, 1);
  ok(res, { deleted: true });
});

app.get('/api/customers/:id/auth', auth, (req, res) => ok(res, null));
app.delete('/api/customers/:id/addresses', auth, (req, res) => ok(res, { deleted: true }));
app.delete('/api/customers/:id/vehicles', auth, (req, res) => ok(res, { deleted: true }));
app.delete('/api/customers/:id/items', auth, (req, res) => ok(res, { deleted: true }));

// ==================== CHARGES ====================
app.get('/api/charges', auth, (req, res) => ok(res, db.charges.filter(c => c.tenant_id === req.user.tenantId)));
app.get('/api/customers/:id/charges', auth, (req, res) => ok(res, db.charges.filter(c => c.customer_id === req.params.id)));

app.post('/api/charges', auth, (req, res) => {
  const c = { id: `charge-${Date.now()}`, tenant_id: req.user.tenantId, status: 'pending', created_at: new Date().toISOString(), ...req.body };
  db.charges.push(c);
  ok(res, c);
});

app.patch('/api/charges/:id', auth, (req, res) => {
  const idx = db.charges.findIndex(c => c.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.charges[idx] = { ...db.charges[idx], ...req.body, updated_at: new Date().toISOString() };
  ok(res, db.charges[idx]);
});

app.delete('/api/charges/:id', auth, (req, res) => {
  const idx = db.charges.findIndex(c => c.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.charges.splice(idx, 1);
  ok(res, { deleted: true });
});

// ==================== COUPONS ====================
app.get('/api/coupons', auth, (req, res) => {
  const coupons = db.coupons.filter(c => c.issuer_tenant_id === req.user.tenantId);
  ok(res, coupons.map(c => ({ ...c, redemption_count: db.coupon_redemptions.filter(r => r.coupon_id === c.id).length })));
});

app.post('/api/coupons', auth, (req, res) => {
  const c = { id: `coupon-${Date.now()}`, issuer_tenant_id: req.user.tenantId, active: true, created_at: new Date().toISOString(), ...req.body };
  db.coupons.push(c);
  ok(res, c);
});

app.patch('/api/coupons/:id', auth, (req, res) => {
  const idx = db.coupons.findIndex(c => c.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.coupons[idx] = { ...db.coupons[idx], ...req.body, updated_at: new Date().toISOString() };
  ok(res, db.coupons[idx]);
});

app.delete('/api/coupons/:id', auth, (req, res) => {
  const idx = db.coupons.findIndex(c => c.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.coupons.splice(idx, 1);
  ok(res, { deleted: true });
});

app.get('/api/coupons/:id/redemptions', auth, (req, res) => ok(res, db.coupon_redemptions.filter(r => r.coupon_id === req.params.id)));

// ==================== ACTIVITY LOGS ====================
app.get('/api/activity-logs', auth, (req, res) => {
  let logs = db.activity_logs.filter(l => l.tenant_id === req.user.tenantId);
  if (req.query.action) logs = logs.filter(l => l.action === req.query.action);
  if (req.query.resource) logs = logs.filter(l => l.resource === req.query.resource);
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  ok(res, { logs: logs.slice(offset, offset + limit), total: logs.length });
});

app.post('/api/activity-logs', auth, (req, res) => {
  const log = { id: `log-${Date.now()}`, tenant_id: req.user.tenantId, user_id: req.user.userId, created_at: new Date().toISOString(), ...req.body };
  db.activity_logs.push(log);
  ok(res, log);
});

app.get('/api/activity-logs/actions', auth, (req, res) => ok(res, [...new Set(db.activity_logs.filter(l => l.tenant_id === req.user.tenantId).map(l => l.action))]));
app.get('/api/activity-logs/resources', auth, (req, res) => ok(res, [...new Set(db.activity_logs.filter(l => l.tenant_id === req.user.tenantId).map(l => l.resource))]));

// ==================== PLANS ====================
app.get('/api/plans', (req, res) => ok(res, db.plans.filter(p => p.active)));

app.post('/api/plans', auth, (req, res) => {
  const p = { id: `plan-${Date.now()}`, active: true, created_at: new Date().toISOString(), ...req.body };
  db.plans.push(p);
  ok(res, p);
});

app.patch('/api/plans/:id', auth, (req, res) => {
  const idx = db.plans.findIndex(p => p.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.plans[idx] = { ...db.plans[idx], ...req.body, updated_at: new Date().toISOString() };
  ok(res, db.plans[idx]);
});

app.delete('/api/plans/:id', auth, (req, res) => {
  const idx = db.plans.findIndex(p => p.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.plans.splice(idx, 1);
  ok(res, { deleted: true });
});

// Prices
app.get('/api/plans/:id/prices', auth, (req, res) => ok(res, db.plan_prices.filter(p => p.plan_id === req.params.id && p.active)));
app.get('/api/prices', auth, (req, res) => ok(res, db.plan_prices.filter(p => p.active)));
app.post('/api/plans/:id/prices', auth, (req, res) => {
  const p = { id: `price-${Date.now()}`, plan_id: req.params.id, seller_tenant_id: req.user.tenantId, active: true, created_at: new Date().toISOString(), ...req.body };
  db.plan_prices.push(p);
  ok(res, p);
});
app.patch('/api/prices/:id', auth, (req, res) => {
  const idx = db.plan_prices.findIndex(p => p.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.plan_prices[idx] = { ...db.plan_prices[idx], ...req.body };
  ok(res, db.plan_prices[idx]);
});

// Features
app.get('/api/plans/:id/features', auth, (req, res) => ok(res, db.plan_features.filter(f => f.plan_id === req.params.id && f.is_enabled)));
app.get('/api/features', auth, (req, res) => ok(res, db.plan_features.filter(f => f.is_enabled)));
app.post('/api/plans/:id/features', auth, (req, res) => {
  const features = Array.isArray(req.body) ? req.body : [req.body];
  const created = features.map(f => ({ id: `feat-${Date.now()}-${Math.random()}`, plan_id: req.params.id, is_enabled: true, ...f }));
  db.plan_features.push(...created);
  ok(res, created);
});
app.delete('/api/features/:id', auth, (req, res) => {
  const idx = db.plan_features.findIndex(f => f.id === req.params.id);
  if (idx >= 0) db.plan_features.splice(idx, 1);
  ok(res, { deleted: true });
});
app.delete('/api/plans/:id/features', auth, (req, res) => {
  db.plan_features = db.plan_features.filter(f => f.plan_id !== req.params.id);
  ok(res, { deleted: true });
});

// ==================== TENANT SETTINGS ====================
app.get('/api/tenant-settings', auth, (req, res) => {
  const settings = db.tenant_settings.filter(s => s.tenant_id === req.user.tenantId);
  ok(res, settings.length ? settings : [{ tenant_id: req.user.tenantId, whatsapp_enabled: true, chatbot_enabled: false }]);
});

app.post('/api/tenant-settings', auth, (req, res) => {
  const idx = db.tenant_settings.findIndex(s => s.tenant_id === req.user.tenantId && s.key === req.body.key);
  if (idx >= 0) {
    db.tenant_settings[idx].value = req.body.value;
    ok(res, db.tenant_settings[idx]);
  } else {
    const s = { id: `setting-${Date.now()}`, tenant_id: req.user.tenantId, ...req.body, created_at: new Date().toISOString() };
    db.tenant_settings.push(s);
    ok(res, s);
  }
});

app.post('/api/tenant-settings/batch', auth, (req, res) => {
  const settings = Array.isArray(req.body) ? req.body : [req.body];
  const results = settings.map(s => {
    const idx = db.tenant_settings.findIndex(x => x.tenant_id === req.user.tenantId && x.key === s.key);
    if (idx >= 0) {
      db.tenant_settings[idx].value = s.value;
      return db.tenant_settings[idx];
    } else {
      const ns = { id: `setting-${Date.now()}`, tenant_id: req.user.tenantId, ...s, created_at: new Date().toISOString() };
      db.tenant_settings.push(ns);
      return ns;
    }
  });
  ok(res, results);
});

// ==================== REFERRALS ====================
app.get('/api/referrals/links', auth, (req, res) => {
  let links = db.referral_links;
  if (req.query.customer_id) links = links.filter(l => l.customer_id === req.query.customer_id);
  if (req.query.is_active !== undefined) links = links.filter(l => l.is_active === (req.query.is_active === 'true'));
  ok(res, links);
});

app.post('/api/referrals/links', auth, (req, res) => {
  const link = { id: `ref-link-${Date.now()}`, code: `REF${Date.now()}`, is_active: true, total_referrals: 0, total_earned: 0, created_at: new Date().toISOString(), ...req.body };
  db.referral_links.push(link);
  ok(res, link);
});

app.patch('/api/referrals/links/:id', auth, (req, res) => {
  const idx = db.referral_links.findIndex(l => l.id === req.params.id);
  if (idx < 0) return err(res, 'Não encontrado', 404);
  db.referral_links[idx] = { ...db.referral_links[idx], ...req.body };
  ok(res, db.referral_links[idx]);
});

app.get('/api/referrals', auth, (req, res) => {
  let refs = db.referrals;
  if (req.query.referral_link_id) refs = refs.filter(r => r.referral_link_id === req.query.referral_link_id);
  ok(res, refs);
});

app.get('/api/referrals/transactions', auth, (req, res) => {
  let txs = db.referral_transactions;
  if (req.query.referral_link_id) txs = txs.filter(t => t.customer_referral_link_id === req.query.referral_link_id);
  ok(res, txs);
});

app.post('/api/referrals/transactions', auth, (req, res) => {
  const tx = { id: `ref-tx-${Date.now()}`, status: 'pending', created_at: new Date().toISOString(), ...req.body };
  db.referral_transactions.push(tx);
  ok(res, tx);
});

// ==================== CHATBOT ====================
app.get('/api/chatbot-config', auth, (req, res) => ok(res, { tenant_id: req.user.tenantId, enabled: false, welcome_message: 'Olá!', fallback_message: 'Não entendi.' }));

// ==================== WEBHOOKS ====================
app.post('/api1/webhook', (req, res) => { console.log('📥 [API1]', JSON.stringify(req.body).slice(0,100)); res.json({ success: true }); });
app.post('/api2/webhook', (req, res) => { console.log('📥 [API2]', JSON.stringify(req.body).slice(0,100)); res.json({ success: true }); });

// ==================== HEALTH ====================
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Mock Backend v2' }));

// ==================== START ====================
app.listen(PORT, () => {
  console.log(`🚀 Mock Backend v2 - http://localhost:${PORT}`);
  console.log('📡 Endpoints: /api/customers, /api/charges, /api/coupons, /api/plans, /api/activity-logs, /api/tenant-settings, /api/referrals');
});
