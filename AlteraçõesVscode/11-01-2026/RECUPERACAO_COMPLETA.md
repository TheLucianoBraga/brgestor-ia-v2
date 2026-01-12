# 🆘 DOCUMENTO DE RECUPERAÇÃO COMPLETA
**Data:** 11 de Janeiro de 2026 - 22:30
**Status:** IA WhatsApp NÃO FUNCIONANDO

## ❌ PROBLEMA ATUAL
- QR Code: ✅ FUNCIONANDO
- WhatsApp conectado: ✅ WORKING
- **IA respondendo mensagens: ❌ NÃO FUNCIONA**
- Erro: `ReferenceError: messageBody is not defined`

---

## 📋 O QUE FOI ALTERADO

### 1. Edge Functions Supabase
- **waha-webhook** (v18): Versão original com bugs de cache
- **waha-webhook-v2** (v3): Versão corrigida DEPLOYED
- Commit GitHub: `ae5693d`

### 2. Configurações Database (tenant_settings)
```sql
tenant_id: a0000000-0000-0000-0000-000000000001 (Braga Digital)
- gemini_api_key: AIzaSyD8NdTnTuRkPXtMJLKHRp7ifbb6mgyRhtY
- waha_api_key: BragaDIGITal_OBrabo_1996_2025Br
- waha_api_url: https://waha.brgestor.com
```

### 3. Frontend (src/pages/app/WhatsApp.tsx)
- Mudou de POST /api/{session}/settings para PUT /api/sessions/{session}
- Mudou de POST /api/{session}/auth/logout para POST /api/sessions/{session}/stop
- Webhook configurado para: waha-webhook-v2

### 4. VPS (72.60.14.172)
- WAHA rodando em Docker (porta 3000)
- Caddy proxy: waha.brgestor.com → localhost:3000
- API Key real: BragaDIGITal_OBrabo_1996_2025Br

---

## 🔧 OPÇÃO 1: TENTAR CORRIGIR (Última Tentativa)

### Passo 1: Verificar se webhook está configurado no WAHA
```bash
ssh -i ./Sensivel/deploy_key_brgestor typebot@72.60.14.172
curl -X GET "http://localhost:3000/api/sessions/tenant_a0000000" \
  -H "X-Api-Key: BragaDIGITal_OBrabo_1996_2025Br"
```

**Deve retornar:**
```json
{
  "config": {
    "webhooks": [{
      "url": "https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/waha-webhook-v2",
      "events": ["message"]
    }]
  }
}
```

### Passo 2: Se webhook NÃO estiver configurado
Execute no WhatsApp.tsx (app) ou via curl:
```bash
curl -X PUT "https://waha.brgestor.com/api/sessions/tenant_a0000000" \
  -H "X-Api-Key: BragaDIGITal_OBrabo_1996_2025Br" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "webhooks": [{
        "url": "https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/waha-webhook-v2",
        "events": ["message"]
      }]
    }
  }'
```

### Passo 3: Testar manualmente o webhook
```bash
curl -X POST "https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/waha-webhook-v2" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message",
    "session": "tenant_a0000000",
    "payload": {
      "from": "5548999999999@c.us",
      "body": "teste",
      "fromMe": false
    }
  }'
```

---

## 🔄 OPÇÃO 2: REVERTER TUDO (Seguro)

### Passo 1: Reverter código do GitHub
```bash
git log --oneline  # Ver commits
git revert ae5693d  # Reverter último commit
git push origin master
```

### Passo 2: Deletar waha-webhook-v2
```bash
npx supabase functions delete waha-webhook-v2
```

### Passo 3: Usar a versão ORIGINAL (waha-webhook v18)
No WhatsApp.tsx, mudar webhook URL de volta:
```typescript
webhooks: [{
  url: 'https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/waha-webhook',
  events: ['message']
}]
```

### Passo 4: Limpar configurações do banco
```sql
DELETE FROM tenant_settings 
WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001'
AND key IN ('gemini_api_key', 'waha_api_key', 'waha_api_url');
```

---

## 🆘 OPÇÃO 3: COMEÇAR DO ZERO (Mais Seguro)

### 1. Desconectar WhatsApp atual
- No app: WhatsApp → Desconectar
- Limpar sessão

### 2. Usar Evolution API (alternativa ao WAHA)
- Já está instalado no VPS (evolution@2026)
- Mais estável e testado
- Documentação: https://doc.evolution-api.com

### 3. Configurar Evolution API
```bash
ssh typebot@72.60.14.172
cd /home/evolution  # ou onde está instalado
docker-compose up -d
```

---

## 📞 SUPORTE PROFISSIONAL

Se precisar de ajuda externa:

### Dados do Projeto
- **Projeto:** BR Gestor IA v2
- **GitHub:** TheLucianoBraga/brgestor-ia-v2
- **Supabase:** uoogxqtbasbvcmtgxzcu
- **VPS:** 72.60.14.172 (typebot@2026)

### Arquivos Importantes
- `supabase/functions/waha-webhook-v2/index.ts` (2198 linhas)
- `src/pages/app/WhatsApp.tsx` (configuração QR Code)
- `AlteraçõesVscode/11-01-2026/*.sql` (configurações banco)
- `Sensivel/CREDENCIAIS_VPS.md` (acessos)

### Problema Principal
- Edge Function recebe webhook do WAHA
- Erro: `messageBody is not defined` na linha ~959
- Código tem `let messageBody = ...` mas erro persiste
- Possível causa: Supabase cache ou deploy não aplicado

---

## 💡 DIAGNÓSTICO FINAL

**O QUE ESTÁ FUNCIONANDO:**
1. ✅ QR Code gera e conecta
2. ✅ WhatsApp fica WORKING
3. ✅ WAHA recebe mensagens
4. ✅ Webhook é chamado

**O QUE NÃO FUNCIONA:**
1. ❌ Edge Function processa mensagem
2. ❌ IA responde no WhatsApp

**CAUSA PROVÁVEL:**
- Deploy da Edge Function não aplicou correção
- OU webhook está chamando versão errada (waha-webhook em vez de waha-webhook-v2)
- OU erro está em linha DIFERENTE (não é linha 959)

---

## 📝 PRÓXIMOS PASSOS RECOMENDADOS

1. **VERIFICAR** qual webhook está configurado no WAHA (Passo 1 da Opção 1)
2. **SE** webhook correto, **DELETAR** waha-webhook-v2 e **RECRIAR** do zero
3. **SE** não resolver, **REVERTER** tudo (Opção 2)
4. **SE** ainda não resolver, **MIGRAR** para Evolution API (Opção 3)

---

**DESCULPE pela frustração.** Todos os arquivos estão salvos no GitHub (commit ae5693d).
Você pode reverter, continuar, ou buscar outro desenvolvedor com este documento.
