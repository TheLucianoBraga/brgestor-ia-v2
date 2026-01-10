-- Tabela para rastrear saques e uso de crédito de indicações
CREATE TABLE public.referral_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_referral_link_id UUID NOT NULL REFERENCES public.customer_referral_links(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payout', 'credit_used')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  pix_key TEXT,
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_referral_transactions_customer ON public.referral_transactions(customer_id);
CREATE INDEX idx_referral_transactions_tenant ON public.referral_transactions(tenant_id);
CREATE INDEX idx_referral_transactions_status ON public.referral_transactions(status);

-- RLS
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;

-- Cliente pode ver suas transações
CREATE POLICY "Customers can view their own transactions"
ON public.referral_transactions
FOR SELECT
USING (customer_id IN (
  SELECT id FROM public.customers WHERE customer_tenant_id = auth.uid()::text::uuid
));

-- Cliente pode criar transações (solicitar saque/crédito)
CREATE POLICY "Customers can create transactions"
ON public.referral_transactions
FOR INSERT
WITH CHECK (customer_id IN (
  SELECT id FROM public.customers WHERE customer_tenant_id = auth.uid()::text::uuid
));

-- Tenant owner pode ver transações do seu tenant
CREATE POLICY "Tenant members can view tenant transactions"
ON public.referral_transactions
FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
));

-- Tenant owner pode atualizar status (aprovar/rejeitar)
CREATE POLICY "Tenant admins can update transactions"
ON public.referral_transactions
FOR UPDATE
USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role_in_tenant IN ('owner', 'admin')
));