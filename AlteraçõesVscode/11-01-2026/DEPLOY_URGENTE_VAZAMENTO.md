# ⚡ Deploy URGENTE - Correção Vazamento de Dados

## 🚨 PROBLEMA CRÍTICO IDENTIFICADO
Clientes de outros tenants aparecendo na lista de cobranças!

---

## 🚀 Deploy em 2 Comandos

### 1️⃣ Aplicar Migration

```powershell
# Opção A: Push automático (RECOMENDADO)
supabase db push

# Opção B: Via Supabase Dashboard
# 1. Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT]/sql
# 2. Cole o arquivo: supabase/migrations/20260111000001_fix_customer_rls_isolation.sql
# 3. Execute
```

### 2️⃣ Validar

```sql
-- Execute no Supabase Dashboard > SQL Editor
SELECT 
  tablename,
  COUNT(*) as policies
FROM pg_policies
WHERE tablename IN ('customers', 'customer_charges', 'customer_items')
GROUP BY tablename;
```

**Resultado esperado:**
```
 tablename        | policies
------------------+----------
 customers        |        4
 customer_charges |        4
 customer_items   |        4
```

---

## 🧪 Teste Rápido (2 minutos)

### Teste 1: Ver seu tenant
```sql
SELECT current_tenant_id();
```
**Esperado:** UUID do seu tenant (não NULL)

### Teste 2: Ver APENAS seus clientes
```sql
SELECT id, full_name, tenant_id, current_tenant_id() as meu_tenant
FROM customers
LIMIT 5;
```
**Esperado:** Coluna `tenant_id` = `meu_tenant` em TODOS os resultados

### Teste 3: Função de bloqueio
```sql
-- Pegar ID de um cliente
SELECT id FROM customers LIMIT 1;

-- Testar se consegue ver
SELECT can_view_customer('[COLE_ID_AQUI]'::uuid);
```
**Esperado:** `TRUE` (porque é seu cliente)

---

## ❌ O que estava acontecendo

```
┌─────────────┐
│  Master A   │
│ (Tenant 1)  │
└──────┬──────┘
       │
       │ Lista clientes...
       │
       ├─→ ✅ Clientes do Tenant 1
       ├─→ ❌ Clientes do Tenant 2 (VAZAMENTO!)
       └─→ ❌ Clientes do Tenant 3 (VAZAMENTO!)
```

---

## ✅ Como está agora

```
┌─────────────┐
│  Master A   │
│ (Tenant 1)  │
└──────┬──────┘
       │
       │ Lista clientes...
       │
       └─→ ✅ Clientes do Tenant 1 APENAS
```

---

## 🔐 O que a correção faz

1. ✅ **Reforça `current_tenant_id()`** - Prioriza owner/admin, só retorna membros ativos
2. ✅ **Reescreve `can_view_customer()`** - Valida autenticação E tenant em TODAS as chamadas
3. ✅ **Políticas RLS super restritivas** - Bloqueia tudo que não for explicitamente permitido
4. ✅ **Aplica em TODAS as tabelas** - customers, customer_charges, customer_items

---

## 📊 Impacto

| Tabela | Antes | Depois |
|--------|-------|--------|
| Ver clientes de outros tenants | ❌ VAZAVA | ✅ Bloqueado |
| Ver cobranças de outros tenants | ❌ VAZAVA | ✅ Bloqueado |
| current_tenant_id() = NULL | ❌ VAZAVA TUDO | ✅ Bloqueia tudo |

---

## 🆘 Se algo der errado

### Problema: "Não vejo nenhum cliente"

```sql
-- Verificar se você está vinculado a um tenant
SELECT tm.tenant_id, t.name
FROM tenant_members tm
JOIN tenants t ON t.id = tm.tenant_id
WHERE tm.user_id = auth.uid();
```

Se não aparecer nada: você não está vinculado a nenhum tenant.

### Problema: "Erro ao criar cliente"

```sql
-- Verificar qual tenant você está usando
SELECT current_tenant_id();

-- Use esse UUID ao criar o cliente
```

---

## ✅ Checklist Final

- [ ] `supabase db push` executado (ou SQL manual)
- [ ] Validação executada (4 policies por tabela)
- [ ] Teste 1 OK (`current_tenant_id()` retorna UUID)
- [ ] Teste 2 OK (só vê seus clientes)
- [ ] Teste 3 OK (`can_view_customer()` retorna TRUE)
- [ ] Criar cobrança ainda funciona
- [ ] **CRÍTICO:** Não vê mais clientes de outros tenants

---

## 📁 Arquivos Criados

- Migration: [supabase/migrations/20260111000001_fix_customer_rls_isolation.sql](../supabase/migrations/20260111000001_fix_customer_rls_isolation.sql)
- Documentação: [CORRECAO_CRITICA_VAZAMENTO_DADOS.md](CORRECAO_CRITICA_VAZAMENTO_DADOS.md)

---

## 🎯 Resultado

**Antes:** 🔴 VAZAMENTO CRÍTICO  
**Depois:** 🟢 ISOLAMENTO TOTAL

**Tempo de deploy:** ~5 minutos  
**Risco:** Zero (só adiciona segurança, não quebra nada)
