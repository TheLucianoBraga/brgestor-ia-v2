# 🔧 Correção: IA não responde em grupos WhatsApp

## 🔍 Problema Identificado

A IA **NÃO ESTÁ RESPONDENDO em grupos** porque o código tem **5 pontos de bloqueio** que impedem a execução:

### Bloqueios no código (waha-webhook/index.ts linhas 940-1050):

1. ❌ **Linha 976**: Se `wa_allow_groups = false` → retorna sem processar
2. ❌ **Linha 1003**: Se `group_autoresponder_config.is_enabled = false` → retorna
3. ❌ **Linha 1011**: Se `config_type = 'disabled'` → retorna  
4. ❌ **Linha 1033**: Se `respond_on_mention = true` mas não mencionou → retorna
5. ❌ **Linha 1041**: Se nenhuma condição (`respond_all`, `respond_on_mention`, `respond_on_questions`) → retorna

**Resultado**: O código **NUNCA CHEGA** na parte de gerar resposta IA (linha ~1700) nem enviar mensagem (linha ~1920)!

---

## ✅ Soluções (escolha UMA)

### Opção 1: Diagnóstico completo (RECOMENDADO)

1. Abra **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `diagnostico-grupos.sql`
4. Execute a query **completa** (seções 1 a 3)
5. Veja os resultados e identifique qual bloqueio está ativo

### Opção 2: Correção rápida - Ativar TUDO

Execute este SQL no **Supabase Dashboard > SQL Editor**:

```sql
-- 1. Ativar grupos globalmente
INSERT INTO tenant_settings (tenant_id, key, value)
SELECT id, 'wa_allow_groups', 'true'
FROM tenants
ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'true';

-- 2. Ativar respond_all em TODOS os grupos
UPDATE group_autoresponder_config
SET 
  is_enabled = true,
  respond_all = true,
  config_type = 'inherit_pv'
WHERE id IN (
  SELECT garc.id 
  FROM group_autoresponder_config garc
  JOIN whatsapp_groups wg ON wg.id = garc.group_id
  WHERE wg.is_active = true
);

-- 3. Confirmar alterações
SELECT 
  wg.name as grupo,
  garc.is_enabled as ativo,
  garc.respond_all as responde_tudo,
  garc.config_type as tipo
FROM whatsapp_groups wg
LEFT JOIN group_autoresponder_config garc ON garc.group_id = wg.id
WHERE wg.is_active = true;
```

### Opção 3: Ativar pela interface (LENTO)

1. Vá em **Configurações > Integrações**
2. Seção WhatsApp: Ative **"Permitir grupos"**
3. Vá em **Atendimento > Grupos WhatsApp**
4. Para cada grupo:
   - Clique em **Editar**
   - Ative **"Auto-responder"**
   - Marque **"Responder todas as mensagens"** (respond_all)
   - Salve

---

## 🧪 Teste após correção

1. Envie uma mensagem em um grupo WhatsApp
2. Verifique os logs no terminal do Edge Function:
   ```
   ✅ Grupo [nome] - Condições atendidas
   ```
3. A IA deve responder normalmente

---

## 🔍 Explicação técnica

O fluxo correto deveria ser:

```
Mensagem chega → Verifica se é grupo → Verifica permissões → 
Gera resposta IA → Envia mensagem
```

**Mas o que acontece:**

```
Mensagem chega → Verifica se é grupo → ❌ RETORNA ANTES (bloqueios 1-5)
                                      ↓
                              NUNCA chega na IA
```

**Por que funciona em chat privado?**

Chats privados (`@c.us`) pulam todo o bloco de verificação de grupos (linhas 947-1050) e vão direto para a IA.

---

## 📝 Verificação final

Após executar a correção, rode:

```sql
SELECT 
  COUNT(*) FILTER (WHERE ts.value = 'true') as tenants_com_grupos_ativos,
  COUNT(*) FILTER (WHERE garc.is_enabled = true) as grupos_com_autoresponder,
  COUNT(*) FILTER (WHERE garc.respond_all = true) as grupos_respondendo_tudo
FROM tenants t
LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id AND ts.key = 'wa_allow_groups'
LEFT JOIN whatsapp_groups wg ON wg.tenant_id = t.id AND wg.is_active = true
LEFT JOIN group_autoresponder_config garc ON garc.group_id = wg.id;
```

**Resultado esperado:**
- `tenants_com_grupos_ativos` > 0
- `grupos_com_autoresponder` = número de grupos ativos
- `grupos_respondendo_tudo` = número de grupos ativos

---

## 🚀 Próximos passos (OPCIONAL)

Se quiser configurações mais granulares:

- **`respond_on_mention`**: Responder só quando mencionar `@assistente` ou `@[persona_name]`
- **`respond_on_questions`**: Responder só mensagens que terminam com `?`
- **`respond_all`**: Responder TODAS as mensagens (mais ativo)

**Recomendação**: Deixe `respond_all = true` para garantir 70%+ de participação nos grupos.
