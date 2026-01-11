# 🚀 Guia de Deploy - Correção IA WhatsApp

## ✅ Correções Aplicadas

✔️ **Arquivo corrigido:** `supabase/functions/waha-webhook/index.ts`  
✔️ **Problemas resolvidos:** 6 bloqueios críticos que impediam a IA de responder  
✔️ **Sem erros:** Código validado e sem erros de sintaxe  

---

## 📋 Passos para Deploy

### 1️⃣ Fazer Deploy da Edge Function

```powershell
# Navegar até a raiz do projeto
cd "c:\Users\thebr\OneDrive\0.Serviço\Automação\1. VPS\brgestor-ia-v2"

# Fazer deploy da função corrigida
supabase functions deploy waha-webhook
```

**Saída esperada:**
```
Deploying waha-webhook (project ref: ...)
✓ waha-webhook deployed successfully
```

---

### 2️⃣ Executar Script SQL de Ativação

1. Abra **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo: `AlteraçõesVscode/11-01-2026/verificar-e-ativar-ia-whatsapp.sql`
4. Execute **SEÇÃO 1** (Diagnóstico) para ver o estado atual
5. Execute **SEÇÃO 2** (Ativação) para ativar tudo
6. Execute **SEÇÃO 3** (Verificação) para confirmar

**OU execute direto via CLI:**

```powershell
# Executar apenas a seção de ativação
supabase db execute --file "AlteraçõesVscode/11-01-2026/verificar-e-ativar-ia-whatsapp.sql"
```

---

### 3️⃣ Verificar Logs em Tempo Real

```powershell
# Monitorar logs da função
supabase functions logs waha-webhook --follow
```

**Logs esperados após correção:**
```
✅ Grupo permitido, processando: 123456789@g.us
📞 Chamando Gemini 2.0 Flash Exp...
✅ Response sent successfully
```

---

### 4️⃣ Testar no WhatsApp

#### Teste 1: Chat Privado
1. Envie uma mensagem para o número do bot
2. Aguarde resposta (deve responder em ~3-5 segundos)

#### Teste 2: Grupo WhatsApp
1. Envie uma mensagem em um grupo onde o bot está
2. Aguarde resposta (deve responder em ~3-5 segundos)

---

## 🔍 Troubleshooting

### ❌ Problema: IA não responde em chats privados

**Verificar:**
1. `wa_auto_enabled = 'true'`
2. `wa_auto_mode_default = 'ia'`
3. Gemini API Key configurada
4. WAHA conectado

**Comando SQL:**
```sql
SELECT key, value 
FROM tenant_settings 
WHERE key IN ('wa_auto_enabled', 'wa_auto_mode_default', 'gemini_api_key', 'waha_api_url')
AND tenant_id = '[SEU_TENANT_ID]';
```

---

### ❌ Problema: IA não responde em grupos

**Verificar:**
1. `wa_allow_groups = 'true'`
2. Grupo tem `is_enabled = true` e `respond_all = true`

**Comando SQL:**
```sql
SELECT 
  wg.name,
  garc.is_enabled,
  garc.respond_all
FROM whatsapp_groups wg
LEFT JOIN group_autoresponder_config garc ON garc.group_id = wg.id
WHERE wg.is_active = true;
```

**Correção rápida:**
```sql
UPDATE group_autoresponder_config
SET is_enabled = true, respond_all = true
WHERE group_id IN (SELECT id FROM whatsapp_groups WHERE is_active = true);
```

---

### ❌ Problema: Erro "Gemini API key not configured"

**Solução:**
```sql
INSERT INTO tenant_settings (tenant_id, key, value)
VALUES ('[SEU_TENANT_ID]', 'gemini_api_key', '[SUA_CHAVE_GEMINI]')
ON CONFLICT (tenant_id, key) DO UPDATE SET value = '[SUA_CHAVE_GEMINI]';
```

**Obter chave Gemini:**
https://aistudio.google.com/app/apikey

---

### ❌ Problema: Erro "WAHA not configured"

**Solução:**
```sql
-- WAHA URL
INSERT INTO tenant_settings (tenant_id, key, value)
VALUES ('[SEU_TENANT_ID]', 'waha_api_url', 'https://seu-waha.com')
ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'https://seu-waha.com';

-- WAHA API Key
INSERT INTO tenant_settings (tenant_id, key, value)
VALUES ('[SEU_TENANT_ID]', 'waha_api_key', '[SUA_CHAVE_WAHA]')
ON CONFLICT (tenant_id, key) DO UPDATE SET value = '[SUA_CHAVE_WAHA]';
```

---

## 📊 Validação Final

Execute este SQL para ver se está tudo OK:

```sql
-- Status completo da IA
SELECT 
  'Config Global' as secao,
  COUNT(*) FILTER (WHERE ts_auto.value = 'true') as auto_enabled_count,
  COUNT(*) FILTER (WHERE ts_mode.value = 'ia') as modo_ia_count,
  COUNT(*) FILTER (WHERE ts_groups.value = 'true') as grupos_enabled_count,
  COUNT(*) FILTER (WHERE ts_gemini.value IS NOT NULL AND ts_gemini.value != '') as gemini_configured,
  COUNT(*) FILTER (WHERE ts_waha.value IS NOT NULL AND ts_waha.value != '') as waha_configured,
  COUNT(*) as total_tenants
FROM tenants t
LEFT JOIN tenant_settings ts_auto ON ts_auto.tenant_id = t.id AND ts_auto.key = 'wa_auto_enabled'
LEFT JOIN tenant_settings ts_mode ON ts_mode.tenant_id = t.id AND ts_mode.key = 'wa_auto_mode_default'
LEFT JOIN tenant_settings ts_groups ON ts_groups.tenant_id = t.id AND ts_groups.key = 'wa_allow_groups'
LEFT JOIN tenant_settings ts_gemini ON ts_gemini.tenant_id = t.id AND ts_gemini.key = 'gemini_api_key'
LEFT JOIN tenant_settings ts_waha ON ts_waha.tenant_id = t.id AND ts_waha.key = 'waha_api_url';
```

**Resultado esperado:**
```
auto_enabled_count = total_tenants
modo_ia_count = total_tenants
grupos_enabled_count = total_tenants
gemini_configured > 0
waha_configured > 0
```

---

## ✅ Checklist Final

- [ ] Deploy da Edge Function executado
- [ ] Script SQL de ativação executado
- [ ] Configurações verificadas (wa_auto_enabled, wa_auto_mode_default, wa_allow_groups)
- [ ] Gemini API Key configurada
- [ ] WAHA API URL e Key configuradas
- [ ] Teste em chat privado OK
- [ ] Teste em grupo WhatsApp OK
- [ ] Logs mostrando respostas da IA

---

## 🎯 Status Final Esperado

✅ **IA responde em chats privados:** SIM  
✅ **IA responde em grupos:** SIM  
✅ **Configurações ativas por padrão:** SIM  
✅ **Logs claros e informativos:** SIM  
✅ **Sem bloqueios desnecessários:** SIM  

**Tempo de resposta esperado:** 3-5 segundos  
**Taxa de sucesso esperada:** ~100% (exceto se explicitamente desabilitado)
