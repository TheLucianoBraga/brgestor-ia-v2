-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  full_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NULL,
  cpf_cnpj TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customer_addresses table
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  cep TEXT NULL,
  street TEXT NULL,
  number TEXT NULL,
  complement TEXT NULL,
  district TEXT NULL,
  city TEXT NULL,
  state TEXT NULL
);

-- Create customer_vehicles table
CREATE TABLE public.customer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plate TEXT NULL,
  model TEXT NULL,
  year TEXT NULL,
  color TEXT NULL,
  notes TEXT NULL
);

-- Create customer_items table
CREATE TABLE public.customer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  plan_name TEXT NULL,
  price NUMERIC(12,2) DEFAULT 0,
  due_date DATE NULL,
  expires_at DATE NULL,
  status TEXT NOT NULL DEFAULT 'active',
  discount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers
CREATE POLICY "Users can view customers from their tenant"
  ON public.customers FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create customers in their tenant"
  ON public.customers FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update customers in their tenant"
  ON public.customers FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete customers in their tenant"
  ON public.customers FOR DELETE
  USING (tenant_id = current_tenant_id());

-- RLS policies for customer_addresses (via customer ownership)
CREATE POLICY "Users can view customer_addresses from their tenant"
  ON public.customer_addresses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can create customer_addresses in their tenant"
  ON public.customer_addresses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can update customer_addresses in their tenant"
  ON public.customer_addresses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can delete customer_addresses in their tenant"
  ON public.customer_addresses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

-- RLS policies for customer_vehicles (via customer ownership)
CREATE POLICY "Users can view customer_vehicles from their tenant"
  ON public.customer_vehicles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can create customer_vehicles in their tenant"
  ON public.customer_vehicles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can update customer_vehicles in their tenant"
  ON public.customer_vehicles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can delete customer_vehicles in their tenant"
  ON public.customer_vehicles FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

-- RLS policies for customer_items (via customer ownership)
CREATE POLICY "Users can view customer_items from their tenant"
  ON public.customer_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can create customer_items in their tenant"
  ON public.customer_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can update customer_items in their tenant"
  ON public.customer_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));

CREATE POLICY "Users can delete customer_items in their tenant"
  ON public.customer_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = current_tenant_id()));