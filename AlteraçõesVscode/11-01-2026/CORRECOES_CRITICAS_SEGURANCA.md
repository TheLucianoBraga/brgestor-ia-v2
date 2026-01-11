# 🔒 CORREÇÕES CRÍTICAS DE SEGURANÇA - 11/01/2026

## ✅ CORREÇÕES APLICADAS (4 Erros Críticos)

### 1. ✅ DELETE de Cobranças sem Validação de Tenant
**Arquivo**: `src/pages/app/Cobrancas.tsx`
**Problema**: Usuário poderia deletar cobranças de outros tenants
**Correção**: Adicionado `.eq('tenant_id', currentTenant.id)` no DELETE

```typescript
// ❌ ANTES (INSEGURO)
.delete()
.eq('id', deletingCharge.id);

// ✅ DEPOIS (SEGURO)
.delete()
.eq('id', deletingCharge.id)
.eq('tenant_id', currentTenant.id); // 🔒 Valida propriedade
```

---

### 2. ✅ UPDATE de Cobranças sem Validação de Tenant
**Arquivo**: `src/pages/app/Cobrancas.tsx`
**Problema**: Usuário poderia modificar cobranças de outros tenants
**Correção**: Adicionado `.eq('tenant_id', currentTenant.id)` no UPDATE

```typescript
// ❌ ANTES (INSEGURO)
.update({ description, amount, due_date })
.eq('id', editingCharge.id);

// ✅ DEPOIS (SEGURO)
.update({ description, amount, due_date })
.eq('id', editingCharge.id)
.eq('tenant_id', currentTenant.id); // 🔒 Valida propriedade
```

---

### 3. ✅ Endpoint Público Marca Cobrança como Paga
**Arquivo**: `src/pages/public/Invoice.tsx`
**Problema**: **CRÍTICO** - Qualquer pessoa podia marcar qualquer cobrança como paga sem pagar
**Correção**: Removido UPDATE direto, adicionado warning

```typescript
// ❌ ANTES (BRECHA DE SEGURANÇA!)
const handlePaymentSuccess = async () => {
  await supabase
    .from('customer_charges')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', chargeId); // Sem validação!
  setIsPaid(true);
};

// ✅ DEPOIS (SEGURO)
const handlePaymentSuccess = async () => {
  // Apenas atualiza UI, não o banco
  console.warn('⚠️ Marcar como pago deve ser via webhook validado');
  setIsPaid(true);
  toast.success('Aguardando confirmação...');
  // TODO: Implementar polling para verificar status real
};
```

**⚠️ IMPORTANTE**: Agora os pagamentos só devem ser confirmados via:
- Webhooks autenticados dos gateways (Stripe, MercadoPago, etc)
- Edge Functions com validação de assinatura
- Admin manualmente no painel

---

### 4. ✅ Query com ID Placeholder Gera Erro 400
**Arquivo**: `src/hooks/useChildTenants.ts`
**Problema**: Erro 400 no console quando currentTenant.id é placeholder
**Correção**: Validação prévia antes da query

```typescript
// ✅ ADICIONADO
if (!currentTenant.id || currentTenant.id.startsWith('a0000000')) {
  console.warn('⚠️ Tenant ID inválido, aguardando tenant real');
  setChildren([]);
  setIsLoading(false);
  return;
}
```

---

## ⚠️ PRÓXIMOS PASSOS CRÍTICOS

### 🔐 CONFIGURAR RLS NO SUPABASE (URGENTE!)

Acesse: https://supabase.com/dashboard/project/uoogxqtbasbvcmtgxzcu

#### Tabela: `customers`
```sql
-- Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT
CREATE POLICY "Users can view their tenant customers"
ON customers FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Policy: INSERT
CREATE POLICY "Users can insert customers in their tenant"
ON customers FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Policy: UPDATE
CREATE POLICY "Users can update their tenant customers"
ON customers FOR UPDATE
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Policy: DELETE
CREATE POLICY "Users can delete their tenant customers"
ON customers FOR DELETE
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));
```

#### Tabela: `customer_charges`
```sql
-- Habilitar RLS
ALTER TABLE customer_charges ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT
CREATE POLICY "Users can view their tenant charges"
ON customer_charges FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Policy: INSERT
CREATE POLICY "Users can insert charges in their tenant"
ON customer_charges FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Policy: UPDATE
CREATE POLICY "Users can update their tenant charges"
ON customer_charges FOR UPDATE
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Policy: DELETE
CREATE POLICY "Users can delete their tenant charges"
ON customer_charges FOR DELETE
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));
```

#### Tabela: `customer_items`
```sql
ALTER TABLE customer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items of their tenant customers"
ON customer_items FOR ALL
USING (
  customer_id IN (
    SELECT id FROM customers WHERE tenant_id IN (
      SELECT tenant_id FROM tenant_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
);
```

#### Tabela: `tenant_settings`
```sql
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant settings"
ON tenant_settings FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Admins can modify tenant settings"
ON tenant_settings FOR ALL
USING (tenant_id IN (
  SELECT tenant_id FROM tenant_members 
  WHERE user_id = auth.uid() 
  AND role_in_tenant IN ('admin', 'owner')
  AND status = 'active'
));
```

---

### 🔑 REMOVER CREDENCIAIS HARDCODED

#### Edge Function: `waha-simple.ts`
```typescript
// ❌ REMOVER ISTO:
const WAHA_API_KEY = 'BragaDIGITal_OBrabo_1996_2025Br';
const WAHA_API_URL = `http://72.60.14.172:3000`;

// ✅ USAR ISTO:
const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');
const WAHA_API_URL = Deno.env.get('WAHA_API_URL');
```

**Configurar secrets no Supabase**:
```bash
npx supabase secrets set WAHA_API_KEY=BragaDIGITal_OBrabo_1996_2025Br --project-ref uoogxqtbasbvcmtgxzcu
npx supabase secrets set WAHA_API_URL=http://72.60.14.172:3000 --project-ref uoogxqtbasbvcmtgxzcu
npx supabase secrets set VPS_IP=72.60.14.172 --project-ref uoogxqtbasbvcmtgxzcu
```

---

### 📊 CRIAR ÍNDICES PARA PERFORMANCE

```sql
-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);

CREATE INDEX IF NOT EXISTS idx_customer_charges_tenant_id ON customer_charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_charges_customer_id ON customer_charges(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_charges_status ON customer_charges(status);
CREATE INDEX IF NOT EXISTS idx_customer_charges_due_date ON customer_charges(due_date);

CREATE INDEX IF NOT EXISTS idx_customer_items_customer_id ON customer_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_items_status ON customer_items(status);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
```

---

### 🎯 IMPLEMENTAR WEBHOOKS PARA PAGAMENTOS

Criar Edge Functions para cada gateway:

#### `stripe-webhook/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.11.0';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  
  // Validar assinatura
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    signature!,
    secret!
  );
  
  // Processar evento
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const chargeId = paymentIntent.metadata.charge_id;
    
    // Marcar como pago NO BANCO
    await supabase
      .from('customer_charges')
      .update({ 
        status: 'paid', 
        paid_at: new Date().toISOString(),
        payment_gateway: 'stripe',
        payment_id: paymentIntent.id
      })
      .eq('id', chargeId);
  }
  
  return new Response(JSON.stringify({ received: true }));
});
```

---

## 📈 MELHORIAS RECOMENDADAS (Pós-Crítico)

### 1. Validação de Valores Monetários
```typescript
// Adicionar em todos os hooks de cobrança
if (data.amount <= 0) {
  throw new Error('Valor deve ser maior que zero');
}
if (data.amount > 1000000) {
  throw new Error('Valor máximo excedido');
}
```

### 2. Soft Delete ao invés de Hard Delete
```sql
-- Adicionar coluna deleted_at
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE customer_charges ADD COLUMN deleted_at TIMESTAMPTZ;

-- Modificar queries para filtrar deletados
-- WHERE deleted_at IS NULL
```

### 3. Rate Limiting
- Configurar no Supabase Dashboard → Settings → API
- Ou usar Cloudflare na frente

### 4. Sanitização de Inputs
```typescript
import DOMPurify from 'dompurify';

// Sanitizar antes de salvar
const sanitizedName = DOMPurify.sanitize(formData.name);
```

---

## ✅ STATUS FINAL

- ✅ **4 Erros Críticos**: CORRIGIDOS
- ⚠️ **RLS**: PENDENTE (configurar no Supabase Dashboard)
- ⚠️ **Secrets**: PENDENTE (configurar via CLI)
- ⚠️ **Webhooks**: PENDENTE (implementar Edge Functions)
- ⚠️ **Índices**: PENDENTE (executar SQL)

**Próximo Deploy**: Após configurar RLS, o sistema estará seguro para produção! 🚀
