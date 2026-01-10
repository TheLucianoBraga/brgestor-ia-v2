# 🔧 CORREÇÃO: Erro ao cadastrar clientes (RLS bloqueando)

## ❌ Erro identificado

```
Erro original: new row violates row-level security policy for table "customers"
POST /rest/v1/customers?select=* 403 (Forbidden)
```

**Causa**: A policy de INSERT verifica `current_tenant_id()`, mas essa função pode retornar `NULL` em alguns contextos, bloqueando o cadastro.

---

## ✅ Solução (escolha UMA)

### Opção 1: Via Supabase Dashboard (RÁPIDO)

Execute este SQL no **SQL Editor**:

```sql
-- Dropar policy antiga
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON public.customers;

-- Criar nova policy mais permissiva
CREATE POLICY "Users can create customers in their tenant" 
ON public.customers FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    tenant_id = current_tenant_id()
    OR
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = customers.tenant_id
      AND tm.user_id = auth.uid()
    )
  )
);
```

### Opção 2: Via Migration (RECOMENDADO para produção)

O arquivo já foi criado em:
```
supabase/migrations/20260110000001_fix_customers_rls.sql
```

Execute com CLI:
```bash
supabase db push
```

---

## 🧪 Teste após correção

1. Vá em **Clientes > Novo Cliente**
2. Preencha:
   - Nome: `Teste RLS`
   - WhatsApp: `(11) 99999-9999`
   - Email: `teste@rls.com`
3. Clique em **Cadastrar**
4. Deve aparecer: ✅ **"Cliente criado com sucesso!"**

---

## 🔍 Verificação da correção

Execute para confirmar que a policy foi atualizada:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  SUBSTRING(qual, 1, 100) as policy_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'customers'
  AND policyname LIKE '%create%'
ORDER BY policyname;
```

Deve retornar a policy com `cmd = INSERT` e `policy_check` mostrando a lógica atualizada.

---

## 🛠️ Se ainda der erro

Execute este diagnóstico:

```sql
-- 1. Verificar se current_tenant_id() existe
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'current_tenant_id';

-- 2. Verificar tenant_members do usuário
SELECT 
  tm.tenant_id,
  t.name as tenant_name,
  tm.role,
  tm.user_id
FROM tenant_members tm
JOIN tenants t ON t.id = tm.tenant_id
WHERE tm.user_id = auth.uid();

-- 3. Testar current_tenant_id()
SELECT current_tenant_id() as meu_tenant_id;
```

Se `current_tenant_id()` retornar `NULL`, o problema é que o usuário não tem `tenant_members` vinculado.

**Correção adicional** (se necessário):
```sql
-- Inserir tenant_member para o usuário atual (substitua o tenant_id)
INSERT INTO tenant_members (tenant_id, user_id, role)
SELECT 
  (SELECT id FROM tenants ORDER BY created_at DESC LIMIT 1),
  auth.uid(),
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_members WHERE user_id = auth.uid()
);
```
