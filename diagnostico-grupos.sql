-- Diagnóstico de configuração de grupos WhatsApp
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Verificar configuração global de grupos
SELECT 
  ts.tenant_id,
  t.name as tenant_name,
  ts.key,
  ts.value,
  CASE 
    WHEN ts.key = 'wa_allow_groups' AND ts.value = 'true' THEN '✅ Grupos permitidos'
    WHEN ts.key = 'wa_allow_groups' AND ts.value = 'false' THEN '❌ Grupos BLOQUEADOS globalmente'
    WHEN ts.key = 'wa_auto_groups_enabled' AND ts.value = 'true' THEN '✅ Grupos permitidos (legado)'
    WHEN ts.key = 'wa_auto_groups_enabled' AND ts.value = 'false' THEN '❌ Grupos bloqueados (legado)'
  END as status
FROM tenant_settings ts
LEFT JOIN tenants t ON t.id = ts.tenant_id
WHERE ts.key IN ('wa_allow_groups', 'wa_auto_groups_enabled', 'wa_persona_name')
ORDER BY ts.tenant_id, ts.key;

-- 2. Verificar grupos cadastrados e suas configurações
SELECT 
  wg.id,
  wg.tenant_id,
  wg.name as grupo_nome,
  wg.waha_group_id,
  wg.is_active,
  garc.is_enabled as auto_responder_ativo,
  garc.config_type,
  garc.respond_all as responde_tudo,
  garc.respond_on_mention as responde_mencao,
  garc.respond_on_questions as responde_perguntas,
  CASE 
    WHEN NOT wg.is_active THEN '❌ Grupo INATIVO'
    WHEN NOT garc.is_enabled THEN '❌ Auto-responder DESATIVADO'
    WHEN garc.config_type = 'disabled' THEN '❌ Config type DISABLED'
    WHEN garc.respond_all THEN '✅ RESPONDE TUDO'
    WHEN garc.respond_on_mention AND garc.respond_on_questions THEN '⚠️ Responde só menção OU pergunta'
    WHEN garc.respond_on_mention THEN '⚠️ Responde só se MENCIONAR'
    WHEN garc.respond_on_questions THEN '⚠️ Responde só PERGUNTAS (?)'
    ELSE '❌ NENHUMA condição ativa'
  END as diagnostico
FROM whatsapp_groups wg
LEFT JOIN group_autoresponder_config garc ON garc.group_id = wg.id
ORDER BY wg.tenant_id, wg.name;

-- 3. Verificar se há tenant_settings faltando
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  CASE 
    WHEN ts1.value IS NULL THEN '❌ FALTA wa_allow_groups'
    WHEN ts1.value = 'false' THEN '⚠️ wa_allow_groups = false'
    ELSE '✅ wa_allow_groups = true'
  END as status_allow_groups,
  CASE 
    WHEN ts2.value IS NULL THEN '⚠️ FALTA wa_persona_name'
    ELSE CONCAT('✅ persona: ', ts2.value)
  END as status_persona
FROM tenants t
LEFT JOIN tenant_settings ts1 ON ts1.tenant_id = t.id AND ts1.key = 'wa_allow_groups'
LEFT JOIN tenant_settings ts2 ON ts2.tenant_id = t.id AND ts2.key = 'wa_persona_name'
ORDER BY t.id;

-- 4. SOLUÇÃO RÁPIDA: Ativar grupos globalmente para todos os tenants
-- DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:

-- INSERT INTO tenant_settings (tenant_id, key, value)
-- SELECT id, 'wa_allow_groups', 'true'
-- FROM tenants
-- ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'true';

-- 5. SOLUÇÃO RÁPIDA: Ativar respond_all em TODOS os grupos
-- DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR:

-- UPDATE group_autoresponder_config
-- SET 
--   is_enabled = true,
--   respond_all = true,
--   config_type = 'inherit_pv'
-- WHERE id IN (
--   SELECT garc.id 
--   FROM group_autoresponder_config garc
--   JOIN whatsapp_groups wg ON wg.id = garc.group_id
--   WHERE wg.is_active = true
-- );
