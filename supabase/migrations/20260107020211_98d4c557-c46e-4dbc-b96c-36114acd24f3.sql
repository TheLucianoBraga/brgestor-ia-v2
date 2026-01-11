
-- Criar tabela customer_referrals para indicações cliente-cliente
CREATE TABLE IF NOT EXISTS public.customer_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_link_id UUID,
  referrer_customer_id UUID NOT NULL,
  referred_customer_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  commission_amount NUMERIC DEFAULT 0,
  commission_type TEXT DEFAULT 'first', -- 'first' ou 'recurring'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'cancelled'
  service_id UUID,
  subscription_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_referrer FOREIGN KEY (referrer_customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_referred FOREIGN KEY (referred_customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Adicionar coluna referrer_customer_id na tabela customers para rastrear quem indicou
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referrer_customer_id UUID REFERENCES customers(id);

-- Criar tabela de links de indicação de clientes
CREATE TABLE IF NOT EXISTS public.customer_referral_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ref_code BIGINT UNIQUE NOT NULL DEFAULT (floor(random() * 90000000 + 10000000)::bigint),
  is_active BOOLEAN DEFAULT true,
  total_referrals INTEGER DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  available_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_id, tenant_id)
);

-- RLS para customer_referrals
ALTER TABLE public.customer_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals of their tenant"
ON public.customer_referrals
FOR SELECT
USING (tenant_id = current_tenant_id());

CREATE POLICY "System can insert referrals"
ON public.customer_referrals
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update referrals"
ON public.customer_referrals
FOR UPDATE
USING (true);

-- RLS para customer_referral_links
ALTER TABLE public.customer_referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own referral links"
ON public.customer_referral_links
FOR SELECT
USING (tenant_id = current_tenant_id() OR customer_id IN (
  SELECT id FROM customers WHERE customer_tenant_id = current_tenant_id()
));

CREATE POLICY "Customers can create their own referral links"
ON public.customer_referral_links
FOR INSERT
WITH CHECK (customer_id IN (
  SELECT id FROM customers WHERE customer_tenant_id = current_tenant_id()
));

-- Policy pública para validar links por ref_code (necessário para cadastro)
CREATE POLICY "Public can read active referral links by code"
ON public.customer_referral_links
FOR SELECT
USING (is_active = true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referrer ON customer_referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referred ON customer_referrals(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referral_links_code ON customer_referral_links(ref_code);
CREATE INDEX IF NOT EXISTS idx_customers_referrer ON customers(referrer_customer_id);
