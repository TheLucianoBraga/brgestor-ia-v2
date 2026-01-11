# ⚡ Comandos Rápidos - Correção IA WhatsApp

## 🚀 Deploy Completo (3 comandos)

```powershell
# 1. Deploy da Edge Function
supabase functions deploy waha-webhook

# 2. Ver logs em tempo real
supabase functions logs waha-webhook --follow

# 3. Testar (envie mensagem no WhatsApp e veja os logs)
```

---

## 🔍 Diagnóstico Rápido

### Verificar se está funcionando:
```sql
-- Executar no Supabase Dashboard > SQL Editor
SELECT 
  ts_auto.value as auto_enabled,
  ts_mode.value as modo,
  ts_groups.value as grupos_enabled,
  CASE WHEN ts_gemini.value IS NOT NULL THEN '✅ OK' ELSE '❌ FALTA' END as gemini,
  CASE WHEN ts_waha.value IS NOT NULL THEN '✅ OK' ELSE '❌ FALTA' END as waha
FROM tenants t
LEFT JOIN tenant_settings ts_auto ON ts_auto.tenant_id = t.id AND ts_auto.key = 'wa_auto_enabled'
LEFT JOIN tenant_settings ts_mode ON ts_mode.tenant_id = t.id AND ts_mode.key = 'wa_auto_mode_default'
LEFT JOIN tenant_settings ts_groups ON ts_groups.tenant_id = t.id AND ts_groups.key = 'wa_allow_groups'
LEFT JOIN tenant_settings ts_gemini ON ts_gemini.tenant_id = t.id AND ts_gemini.key = 'gemini_api_key'
LEFT JOIN tenant_settings ts_waha ON ts_waha.tenant_id = t.id AND ts_waha.key = 'waha_api_url'
LIMIT 1;
```

---

## 🔧 Correção Rápida (se não funcionar)

### Ativar TUDO de uma vez:
```sql
-- Executar no Supabase Dashboard > SQL Editor

-- 1. Auto-responder ON
INSERT INTO tenant_settings (tenant_id, key, value)
SELECT id, 'wa_auto_enabled', 'true' FROM tenants
ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'true';

-- 2. Modo IA
INSERT INTO tenant_settings (tenant_id, key, value)
SELECT id, 'wa_auto_mode_default', 'ia' FROM tenants
ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'ia';

-- 3. Grupos ON
INSERT INTO tenant_settings (tenant_id, key, value)
SELECT id, 'wa_allow_groups', 'true' FROM tenants
ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'true';

-- 4. Grupos respondem TUDO
UPDATE group_autoresponder_config SET is_enabled = true, respond_all = true;
```

---

## 📝 Configurar Chaves (se faltando)

### Gemini API Key:
```sql
INSERT INTO tenant_settings (tenant_id, key, value)
VALUES ('[SEU_TENANT_ID]', 'gemini_api_key', '[SUA_CHAVE]')
ON CONFLICT (tenant_id, key) DO UPDATE SET value = '[SUA_CHAVE]';
```

### WAHA:
```sql
INSERT INTO tenant_settings (tenant_id, key, value)
VALUES 
  ('[TENANT_ID]', 'waha_api_url', 'https://seu-waha.com'),
  ('[TENANT_ID]', 'waha_api_key', '[SUA_CHAVE]')
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;
```

---

## 🧪 Testar

### 1. Chat Privado:
- Envie: "Olá"
- Aguarde resposta em ~5 segundos

### 2. Grupo:
- Envie qualquer mensagem em um grupo
- Aguarde resposta em ~5 segundos

### 3. Ver Logs:
```powershell
supabase functions logs waha-webhook --follow
```

**Logs esperados:**
```
✅ Grupo permitido, processando
📞 Chamando Gemini
✅ Response sent successfully
```

---

## 🆘 Troubleshooting Ultra-Rápido

| Problema | Solução em 1 linha |
|----------|-------------------|
| Não responde nada | Execute o SQL de "Ativar TUDO" acima |
| "Gemini API key not configured" | Configure gemini_api_key no SQL |
| "WAHA not configured" | Configure waha_api_url e waha_api_key |
| Responde em chat mas não em grupo | `UPDATE group_autoresponder_config SET respond_all = true;` |
| Edge function não encontrada | `supabase functions deploy waha-webhook` |

---

## ✅ Checklist 1 Minuto

- [ ] `supabase functions deploy waha-webhook` executado
- [ ] SQL "Ativar TUDO" executado
- [ ] Gemini API Key configurada
- [ ] WAHA configurado
- [ ] Teste OK

**Tempo total:** ~5 minutos
