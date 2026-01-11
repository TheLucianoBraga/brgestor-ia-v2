-- Create plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('adm', 'revenda')),
  created_by_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_users INT DEFAULT 1,
  base_price NUMERIC(12,2) DEFAULT 0,
  per_active_revenda_price NUMERIC(12,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create plan_prices table
CREATE TABLE public.plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  seller_tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  price_monthly NUMERIC(12,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, seller_tenant_id)
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current tenant is master
CREATE OR REPLACE FUNCTION public.is_current_tenant_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants
    WHERE id = current_tenant_id()
      AND type = 'master'
  )
$$;

-- Helper function to check if current tenant is ADM
CREATE OR REPLACE FUNCTION public.is_current_tenant_adm()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants
    WHERE id = current_tenant_id()
      AND type = 'adm'
  )
$$;

-- RLS for plans: Only MASTER can create/edit
CREATE POLICY "Master can view all plans"
ON public.plans
FOR SELECT
USING (is_current_tenant_master());

CREATE POLICY "ADM can view plans"
ON public.plans
FOR SELECT
USING (is_current_tenant_adm());

CREATE POLICY "Revenda can view revenda plans"
ON public.plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = current_tenant_id() AND type = 'revenda'
  )
  AND plan_type = 'revenda'
  AND active = true
);

CREATE POLICY "Master can create plans"
ON public.plans
FOR INSERT
WITH CHECK (
  is_current_tenant_master()
  AND created_by_tenant_id = current_tenant_id()
);

CREATE POLICY "Master can update plans"
ON public.plans
FOR UPDATE
USING (is_current_tenant_master() AND created_by_tenant_id = current_tenant_id())
WITH CHECK (is_current_tenant_master() AND created_by_tenant_id = current_tenant_id());

CREATE POLICY "Master can delete plans"
ON public.plans
FOR DELETE
USING (is_current_tenant_master() AND created_by_tenant_id = current_tenant_id());

-- RLS for plan_prices
-- MASTER can manage all prices where seller is MASTER
CREATE POLICY "Master can view all plan_prices"
ON public.plan_prices
FOR SELECT
USING (is_current_tenant_master());

CREATE POLICY "Master can create plan_prices"
ON public.plan_prices
FOR INSERT
WITH CHECK (
  is_current_tenant_master()
  AND seller_tenant_id = current_tenant_id()
);

CREATE POLICY "Master can update own plan_prices"
ON public.plan_prices
FOR UPDATE
USING (is_current_tenant_master() AND seller_tenant_id = current_tenant_id())
WITH CHECK (is_current_tenant_master() AND seller_tenant_id = current_tenant_id());

CREATE POLICY "Master can delete own plan_prices"
ON public.plan_prices
FOR DELETE
USING (is_current_tenant_master() AND seller_tenant_id = current_tenant_id());

-- ADM can manage prices for revenda plans only
CREATE POLICY "ADM can view plan_prices for revenda plans"
ON public.plan_prices
FOR SELECT
USING (
  is_current_tenant_adm()
  AND EXISTS (
    SELECT 1 FROM public.plans
    WHERE plans.id = plan_prices.plan_id
      AND plans.plan_type = 'revenda'
  )
);

CREATE POLICY "ADM can create plan_prices for revenda plans"
ON public.plan_prices
FOR INSERT
WITH CHECK (
  is_current_tenant_adm()
  AND seller_tenant_id = current_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.plans
    WHERE plans.id = plan_id
      AND plans.plan_type = 'revenda'
  )
);

CREATE POLICY "ADM can update own plan_prices for revenda"
ON public.plan_prices
FOR UPDATE
USING (
  is_current_tenant_adm()
  AND seller_tenant_id = current_tenant_id()
  AND EXISTS (
    SELECT 1 FROM public.plans
    WHERE plans.id = plan_prices.plan_id
      AND plans.plan_type = 'revenda'
  )
)
WITH CHECK (
  is_current_tenant_adm()
  AND seller_tenant_id = current_tenant_id()
);

CREATE POLICY "ADM can delete own plan_prices"
ON public.plan_prices
FOR DELETE
USING (
  is_current_tenant_adm()
  AND seller_tenant_id = current_tenant_id()
);

-- Revenda can view prices for revenda plans (from their parent ADM or MASTER)
CREATE POLICY "Revenda can view available plan_prices"
ON public.plan_prices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = current_tenant_id()
      AND t.type = 'revenda'
  )
  AND EXISTS (
    SELECT 1 FROM public.plans
    WHERE plans.id = plan_prices.plan_id
      AND plans.plan_type = 'revenda'
      AND plans.active = true
  )
  AND active = true
);