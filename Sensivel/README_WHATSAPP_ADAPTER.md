# 🔧 WhatsApp Provider Adapter - Guia de Implementação

## 📋 RESUMO

Sistema agnóstico que permite alternar entre **Evolution API** e **WAHA** sem alterar o código da aplicação principal.

## 🎯 ARQUIVOS CRIADOS

### 1. [`whatsapp-adapter.ts`](whatsapp-adapter.ts)
**Adapter Pattern completo** com:
- ✅ `createInstance(userId)` - Cria instância WhatsApp
- ✅ `sendMessage(phone, text)` - Envia mensagens
- ✅ `getProviderStatus()` - Verifica saúde da API
- ✅ Factory Pattern para selecionar provider automático

### 2. [`supabase-whatsapp-function.ts`](supabase-whatsapp-function.ts)
**Edge Function pronta para deploy** com:
- ✅ Endpoints RESTful
- ✅ Autenticação e CORS
- ✅ Logs automáticos no banco
- ✅ Tratamento de erros

## 🔄 COMO FUNCIONA

### **Variável de Ambiente**
```bash
# No Supabase Dashboard:
CURRENT_PROVIDER=waha      # ou "evolution"
VPS_IP=72.60.14.172
WAHA_API_KEY=waha_api_key_2026
EVOLUTION_API_KEY=evolution_api_key_2026
```

### **Endpoints da API**
```
POST /whatsapp/create-instance    # Criar instância
POST /whatsapp/send-message       # Enviar mensagem  
GET  /whatsapp/status             # Status do provider
POST /whatsapp/switch-provider    # Trocar provider
```

## 🔀 ALTERNÂNCIA AUTOMÁTICA

### **WAHA (Porta 3000)**
```json
{
  "CURRENT_PROVIDER": "waha",
  "createInstance": "POST /api/sessions",
  "sendMessage": "POST /api/sendText"
}
```

### **Evolution API (Porta 8081)**
```json
{
  "CURRENT_PROVIDER": "evolution",
  "createInstance": "POST /instance/create",
  "sendMessage": "POST /message/send/text"
}
```

## 🚀 DEPLOY NO SUPABASE

### **1. Estrutura de Arquivos**
```
supabase/
└── functions/
    ├── whatsapp/
    │   └── index.ts              # supabase-whatsapp-function.ts
    └── _shared/
        └── whatsapp-adapter.ts   # whatsapp-adapter.ts
```

### **2. Comandos de Deploy**
```bash
# Deploy da função
supabase functions deploy whatsapp

# Configurar variáveis de ambiente
supabase secrets set CURRENT_PROVIDER=waha
supabase secrets set VPS_IP=72.60.14.172
supabase secrets set WAHA_API_KEY=waha_api_key_2026
supabase secrets set EVOLUTION_API_KEY=evolution_api_key_2026
```

### **3. Tabelas de Log (Opcional)**
```sql
CREATE TABLE whatsapp_instances_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  provider TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whatsapp_messages_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  text_preview TEXT,
  provider TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 💻 USO NO FRONTEND

### **Criar Instância**
```javascript
const { data, error } = await supabase.functions.invoke('whatsapp', {
  body: { 
    userId: 'user123'
  }
});

if (data.success) {
  console.log('QR Code:', data.qrCode);
  console.log('Provider:', data.provider); // 'waha' ou 'evolution'
}
```

### **Enviar Mensagem**
```javascript
const { data, error } = await supabase.functions.invoke('whatsapp', {
  body: { 
    phone: '5511999999999',
    text: 'Olá! Como posso ajudar?',
    userId: 'user123'
  }
});

if (data.success) {
  console.log('Message ID:', data.messageId);
  console.log('Provider used:', data.provider);
}
```

### **Verificar Status**
```javascript
const { data } = await supabase.functions.invoke('whatsapp', {
  method: 'GET'
});

console.log('Provider ativo:', data.currentProvider);
console.log('Status:', data.success ? 'Online' : 'Offline');
```

## 🔄 TROCAR PROVIDER SEM DOWNTIME

### **Via Script na VPS**
```bash
# Trocar para WAHA
ssh -i ./Sensivel/deploy_key_brgestor typebot@72.60.14.172
cd /home/typebot/saas-stack
./manage-saas.sh switch-to-waha

# Atualizar no Supabase
supabase secrets set CURRENT_PROVIDER=waha
```

### **Via API (Admin)**
```javascript
const { data } = await supabase.functions.invoke('whatsapp', {
  body: { 
    provider: 'evolution' // ou 'waha'
  }
});
```

## ✅ VANTAGENS DO SISTEMA

- 🔄 **Alternância sem código**: Muda apenas variável de ambiente
- 🛡️ **Abstração total**: Frontend não sabe qual API usa
- 📊 **Logs automáticos**: Todas as operações ficam registradas
- ⚡ **Performance**: Factory Pattern otimizado
- 🔧 **Manutenibilidade**: Fácil adicionar novos providers
- 🎯 **Type Safety**: TypeScript com interfaces bem definidas

## 🎉 RESULTADO

Agora seu sistema é **100% agnóstico** ao provider WhatsApp! Pode alternar entre Evolution API e WAHA apenas mudando a variável `CURRENT_PROVIDER` no Supabase. 🚀