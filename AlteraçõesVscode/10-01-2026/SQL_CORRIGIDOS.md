# ✅ SQL Corrigidos (sem deleted_at)

## 1. Ativar grupos WhatsApp globalmente

```sql
-- Ativar grupos globalmente
INSERT INTO tenant_settings (tenant_id, key, value)
SELECT id, 'wa_allow_groups', 'true'
FROM tenants
ON CONFLICT (tenant_id, key) DO UPDATE SET value = 'true';

-- Verificar
SELECT t.name, ts.value as grupos_permitidos
FROM tenants t
LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id AND ts.key = 'wa_allow_groups'
ORDER BY t.name;
```

## 2. Ativar respond_all em todos os grupos

```sql
-- Ativar respond_all em todos os grupos
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

-- Confirmar
SELECT 
  wg.name as grupo,
  garc.is_enabled as ativo,
  garc.respond_all as responde_tudo,
  garc.config_type as tipo
FROM whatsapp_groups wg
LEFT JOIN group_autoresponder_config garc ON garc.group_id = wg.id
WHERE wg.is_active = true;
```

## 3. Diagnóstico de clientes

Execute o arquivo `diagnostico-cadastro-cliente.sql` para identificar o erro exato.

## 4. Teste de criação manual de cliente

```sql
-- Testar criação de cliente sem Edge Function
DO $$
DECLARE
  v_customer_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Pegar seu tenant
  SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at DESC LIMIT 1;
  
  -- Criar cliente teste
  INSERT INTO customers (
    tenant_id,
    full_name,
    whatsapp,
    email,
    status
  ) VALUES (
    v_tenant_id,
    'Cliente Teste Manual',
    '+5511987654321',
    'teste.manual@exemplo.com',
    'active'
  )
  RETURNING id INTO v_customer_id;
  
  RAISE NOTICE 'Cliente criado: %', v_customer_id;
  
  -- DELETAR após teste
  -- DELETE FROM customers WHERE id = v_customer_id;
END;
$$;
```

Se este SQL funcionar, o problema está no frontend ou na Edge Function.  
Se NÃO funcionar, o problema está no banco de dados (constraints, triggers, RLS).

## 5. Verificar último erro na aplicação

Abra o **console do navegador** (F12 > Console) e veja o erro exato quando tentar cadastrar um cliente.

Ou veja os **logs da Edge Function** no Supabase Dashboard > Edge Functions > Logs.
