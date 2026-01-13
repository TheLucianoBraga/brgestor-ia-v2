const express = require('express');
const cors = require('cors');

const app = express();
const port = 5433;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers['content-type']);
  console.log('Body:', req.body);
  next();
});

// Mock da API Supabase para funcionar sem conexão externa
app.post('/auth/login', (req, res) => {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('req.body:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  
  const email = req.body?.email || req.body?.credentials?.email || 'não encontrado';
  console.log('Email extraído:', email);
  
  // Aceitar qualquer tentativa de login para testar
  res.json({
    access_token: 'mock-token-master',
    refresh_token: 'mock-refresh-token',
    user: {
      id: 'master-user-id',
      email: 'thebragafuture@gmail.com',
      user_metadata: {
        full_name: 'Master User',
        role: 'master'
      }
    }
  });
});

app.get('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  console.log('Table request:', table, req.query);
  
  // Mock responses específicas para cada tabela
  const responses = {
    'tenant_settings': [{
      value: 'true'
    }],
    'plans': [{
      id: 1,
      name: 'Plano Básico',
      plan_type: 'adm',
      base_price: 29.90,
      active: true
    }],
    'chatbot_config': [{
      whatsapp_number: '+5511999999999'
    }],
    'profiles': [{
      user_id: 'master-user-id',
      full_name: 'Master User',
      current_tenant_id: 'tenant-master-123', // IMPORTANTE: definir tenant atual
      created_at: new Date().toISOString()
    }],
    'tenant_members': [{
      tenant_id: 'tenant-master-123',
      role_in_tenant: 'owner',
      status: 'active',
      tenants: {
        id: 'tenant-master-123',
        name: 'BR Gestor Master',
        type: 'master',
        status: 'active',
        trial_ends_at: null
      }
    }]
  };
  
  res.json(responses[table] || [{
    id: 1,
    name: 'Mock Item',
    value: 'mock-data'
  }]);
});

app.post('/rpc/:function', (req, res) => {
  const { function: funcName } = req.params;
  console.log('RPC call:', funcName, req.body);
  
  if (funcName === 'get_master_signup_ref_code') {
    res.json('MASTER2026');
  } else {
    res.json({ result: 'ok' });
  }
});

app.listen(port, () => {
  console.log(`Mock API servidor rodando na porta ${port}`);
  console.log(`Login configurado para: thebragafuture@gmail.com`);
});