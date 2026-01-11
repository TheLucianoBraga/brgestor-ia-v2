# ✅ CORREÇÕES WAHA PLUS - ENDPOINTS ATUALIZADOS

**Data:** 11/01/2026  
**Problema:** Frontend usando endpoints incompatíveis com WAHA Plus

---

## 🔧 ENDPOINTS CORRIGIDOS

### ❌ ANTES (Endpoints Antigos - Erro 404)
```javascript
// Configurar webhook
POST /api/{session}/settings  // ❌ NÃO EXISTE no WAHA Plus

// Logout
POST /api/{session}/auth/logout  // ❌ NÃO EXISTE no WAHA Plus
```

### ✅ DEPOIS (Endpoints WAHA Plus)
```javascript
// Configurar webhook (atualizar sessão)
PUT /api/sessions/{session}
Body: {
  name: "tenant_a0000000",
  config: {
    webhooks: [{
      url: "https://...supabase.co/functions/v1/waha-webhook-v2",
      events: ["message"]
    }]
  }
}

// Parar sessão (logout)
POST /api/sessions/{session}/stop
```

---

## 📝 ARQUIVOS MODIFICADOS

### `src/pages/app/WhatsApp.tsx`

1. **handleGenerateQRCode()** (Linha ~286)
   - ❌ `POST /api/${sessionName}/settings`
   - ✅ `PUT /api/sessions/${sessionName}`

2. **Polling após QR Code** (Linha ~389)
   - ❌ `POST /api/${sessionName}/settings`
   - ✅ `PUT /api/sessions/${sessionName}`

3. **handleDisconnect()** (Linha ~498)
   - ❌ `POST /api/${sessionName}/auth/logout`
   - ✅ `POST /api/sessions/${sessionName}/stop`

4. **handleClearSession()** (Linha ~527)
   - ❌ `POST /api/${sessionName}/auth/logout` (duplicado)
   - ✅ `POST /api/sessions/${sessionName}/stop` (apenas uma vez)

---

## 🗄️ BANCO DE DADOS ATUALIZADO

Executado SQL para configurar API key correta:

```sql
-- Configurado para TODOS os tenants
waha_api_key: BragaDIGITal_OBrabo_1996_2025Br
waha_api_url: https://waha.brgestor.com
```

**Tenants configurados:**
- `a0000000-0000-0000-0000-000000000001` (Braga Digital)
- `3f382a55-82a7-4982-a244-eb5d6bcc7330` (Teste Braga)
- `83bfe048-3349-42a1-a7d6-5de4599ab703` (Teste Braga)

---

## 🚀 COMO TESTAR

### 1. **Limpar Cache do Browser**

**Opção A - Chrome DevTools:**
```
F12 → Application → Storage → Clear site data
```

**Opção B - Aba Anônima:**
```
Ctrl+Shift+N (Chrome)
Ctrl+Shift+P (Firefox)
```

**Opção C - Hard Reload:**
```
Ctrl+Shift+R (ou Ctrl+F5)
```

### 2. **No App**
1. Abra **WhatsApp** no menu
2. Clique em **"Limpar Sessão"**
3. Clique em **"Gerar QR Code"**
4. Escanear QR Code com WhatsApp

### 3. **Verificar Console (F12)**

**✅ Deve aparecer:**
```
🔵 Gerando QR Code...
1. Criando sessão: tenant_a0000000
2. Buscando QR Code...
Status: WORKING
3. Configurando webhook...
✅ Webhook configurado!
```

**❌ NÃO DEVE aparecer:**
```
POST .../settings 404 (Not Found)
POST .../auth/logout 404 (Not Found)
```

---

## 🧪 TESTAR IA RESPONDENDO

1. **Envie mensagem** no WhatsApp conectado
2. **Aguarde 2-5 segundos**
3. **IA deve responder automaticamente**

**Se não responder, verificar logs:**
```bash
# Logs do WAHA (procurar por webhook calls)
ssh typebot@72.60.14.172 "docker logs waha --tail 100"

# Logs do Supabase Edge Function
npx supabase functions logs waha-webhook-v2 --follow
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [x] Endpoints atualizados para WAHA Plus
- [x] API key configurada no banco de dados
- [x] Webhook usando waha-webhook-v2
- [x] Cache do Vite limpo
- [ ] Browser cache limpo (VOCÊ precisa fazer)
- [ ] QR Code gerado sem erros 404
- [ ] IA respondendo mensagens WhatsApp

---

## 📚 REFERÊNCIAS

- **WAHA Plus Docs:** Sessions → Update Session
- **Endpoint correto:** `PUT /api/sessions/{session}`
- **Swagger:** https://waha.brgestor.com (quando logado)

---

**Status:** 🟡 Aguardando teste com cache limpo no browser
