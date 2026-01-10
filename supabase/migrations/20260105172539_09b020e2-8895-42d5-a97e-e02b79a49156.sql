-- Tabela de Planos do Tenant
CREATE TABLE public.tenant_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 1,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  entry_fee_mode TEXT DEFAULT 'separate' CHECK (entry_fee_mode IN ('separate', 'first_payment')),
  auto_renew BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Produtos do Tenant
CREATE TABLE public.tenant_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cost_price DECIMAL(10,2) DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  has_price_tiers BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Faixas de Preço por Quantidade
CREATE TABLE public.product_price_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.tenant_products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Descontos
CREATE TABLE public.discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Itens do Desconto (junction para planos e produtos)
CREATE TABLE public.discount_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('plan', 'product')),
  plan_id UUID REFERENCES public.tenant_plans(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.tenant_products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT check_item_reference CHECK (
    (item_type = 'plan' AND plan_id IS NOT NULL AND product_id IS NULL) OR
    (item_type = 'product' AND product_id IS NOT NULL AND plan_id IS NULL)
  )
);

-- Tabela de Assinaturas de Planos do Cliente
CREATE TABLE public.customer_plan_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.tenant_plans(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  discount_id UUID REFERENCES public.discounts(id) ON DELETE SET NULL,
  price DECIMAL(10,2) NOT NULL,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  entry_fee_mode TEXT DEFAULT 'separate',
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_billing_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Compras de Produtos do Cliente
CREATE TABLE public.customer_product_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.tenant_products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  discount_id UUID REFERENCES public.discounts(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_product_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_plans
CREATE POLICY "Users can view tenant plans" ON public.tenant_plans
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert tenant plans" ON public.tenant_plans
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update tenant plans" ON public.tenant_plans
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete tenant plans" ON public.tenant_plans
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- RLS Policies for tenant_products
CREATE POLICY "Users can view tenant products" ON public.tenant_products
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert tenant products" ON public.tenant_products
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update tenant products" ON public.tenant_products
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete tenant products" ON public.tenant_products
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- RLS Policies for product_price_tiers
CREATE POLICY "Users can view price tiers" ON public.product_price_tiers
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM public.tenant_products WHERE tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage price tiers" ON public.product_price_tiers
  FOR ALL USING (
    product_id IN (
      SELECT id FROM public.tenant_products WHERE tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for discounts
CREATE POLICY "Users can view discounts" ON public.discounts
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage discounts" ON public.discounts
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- RLS Policies for discount_items
CREATE POLICY "Users can view discount items" ON public.discount_items
  FOR SELECT USING (
    discount_id IN (
      SELECT id FROM public.discounts WHERE tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage discount items" ON public.discount_items
  FOR ALL USING (
    discount_id IN (
      SELECT id FROM public.discounts WHERE tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for customer_plan_subscriptions
CREATE POLICY "Users can view customer subscriptions" ON public.customer_plan_subscriptions
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage customer subscriptions" ON public.customer_plan_subscriptions
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- RLS Policies for customer_product_purchases
CREATE POLICY "Users can view customer purchases" ON public.customer_product_purchases
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage customer purchases" ON public.customer_product_purchases
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_tenant_plans_tenant ON public.tenant_plans(tenant_id);
CREATE INDEX idx_tenant_products_tenant ON public.tenant_products(tenant_id);
CREATE INDEX idx_discounts_tenant ON public.discounts(tenant_id);
CREATE INDEX idx_customer_subscriptions_customer ON public.customer_plan_subscriptions(customer_id);
CREATE INDEX idx_customer_subscriptions_tenant ON public.customer_plan_subscriptions(tenant_id);
CREATE INDEX idx_customer_purchases_customer ON public.customer_product_purchases(customer_id);
CREATE INDEX idx_customer_purchases_tenant ON public.customer_product_purchases(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_plans_updated_at
  BEFORE UPDATE ON public.tenant_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_products_updated_at
  BEFORE UPDATE ON public.tenant_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_subscriptions_updated_at
  BEFORE UPDATE ON public.customer_plan_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_purchases_updated_at
  BEFORE UPDATE ON public.customer_product_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();