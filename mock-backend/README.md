# 📝 MOCK BACKEND - DOCUMENTAÇÃO TÉCNICA

## 🎯 **Finalidade**
Mock backend local para desenvolvimento frontend sem dependência do backend real na VPS.

## 🏗️ **Estrutura**
```
mock-backend/
├── server.js          # Servidor Express
├── package.json       # Dependências  
├── .env              # Configurações
└── README.md         # Esta documentação
```

## 🚀 **Como usar**
```bash
# Instalar dependências
npm install

# Iniciar servidor
npm run dev

# Verificar saúde  
curl http://localhost:4000/health
```

## 📡 **Endpoints Implementados**

### **Autenticação**
- `POST /auth/login`
  - Body: `{"email": "admin@test.com", "password": "123456"}`
  - Response: `{"user": {...}, "token": "mock-jwt-token"}`

### **REST API (PostgREST Style)**
- `GET /rest/v1/tenant_settings?tenant_id=eq.ID&key=eq.KEY&select=value&limit=1`
- `GET /rest/v1/plans?plan_type=eq.TYPE&active=eq.true&order=base_price.asc`
- `GET /rest/v1/chatbot_config?tenant_id=eq.ID&select=whatsapp_number&limit=1`

### **RPC Procedures**
- `POST /rpc/get_master_signup_ref_code`
  - Response: `{"ref_code": 123456}`

### **Utilitários** 
- `GET /health` - Status do serviço

## 🔄 **Dados Mock**
Todos os dados estão hardcoded no arquivo `server.js` nas variáveis `mockData.*`

## 🎛️ **Configurações**
- **Porta:** 4000 (não conflita com VPS)
- **CORS:** Habilitado para localhost:8080/8081
- **Logs:** Console output para requests

## ⚠️ **Limitações**
- Não persiste dados (memória apenas)
- Sem validação de JWT real
- Sem bcrypt para senhas  
- Filtros PostgREST limitados

## 🔄 **Migração Backend Real**
Quando o backend real estiver pronto:
1. Alterar `vite.config.ts` proxy target
2. Trocar `.env.mock` por `.env.dev`
3. Backend real deve manter mesma estrutura de endpoints