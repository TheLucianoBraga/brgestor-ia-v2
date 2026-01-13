const express = require('express');
const cors = require('cors');

const app = express();
const port = 5433;

app.use(cors());
app.use(express.json());

// Log de debug para ver as requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body || req.query);
  next();
});

// Mock da API Supabase para funcionar sem conexão externa
app.post('/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  const email = req.body?.email || req.body?.credentials?.email;
  
  if (email === 'thebragafuture@gmail.com') {
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
  } else {
    res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'Email ou senha incorretos' 
    });
  }
});

// Qualquer rota de auth que não seja login
app.get('/auth/user', (req, res) => {
  res.json({ 
    id: 'master-user-id',
    email: 'thebragafuture@gmail.com',
    user_metadata: {
      full_name: 'Master User',
      role: 'master'
    }
  });
});

app.post('/auth/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  
  // Mock responses para diferentes tabelas
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
      id: 'master-user-id',
      email: 'thebragafuture@gmail.com',
      full_name: 'Master User',
      role: 'master',
      tenant_id: 'a0000000-0000-0000-0000-000000000001'
    }]
  };
  
  res.json(responses[table] || []);
});

app.post('/rpc/:function', (req, res) => {
  const { function: funcName } = req.params;
  
  if (funcName === 'get_master_signup_ref_code') {
    res.json('MASTER2026');
  } else {
    res.json({ result: 'ok' });
  }
});

// Catch all para outras rotas
app.use('*', (req, res) => {
  console.log(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Mock API servidor rodando na porta ${port}`);
  console.log(`Configurado para funcionar sem VPS até resolver conectividade`);
  console.log(`Login configurado para: thebragafuture@gmail.com`);
});