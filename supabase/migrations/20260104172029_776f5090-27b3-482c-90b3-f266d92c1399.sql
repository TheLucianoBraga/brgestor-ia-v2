-- Add missing columns to customer_vehicles
ALTER TABLE public.customer_vehicles 
ADD COLUMN IF NOT EXISTS brand text NULL,
ADD COLUMN IF NOT EXISTS renavam text NULL;

-- Add missing columns to customer_items
ALTER TABLE public.customer_items 
ADD COLUMN IF NOT EXISTS starts_at date NULL;

-- Ensure email is NOT NULL (update existing nulls first)
UPDATE public.customers SET email = '' WHERE email IS NULL;
ALTER TABLE public.customers ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN email SET DEFAULT '';

-- Ensure RLS is enabled on all customer tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON public.customers;
DROP POLICY IF EXISTS "Users can create customers in their tenant" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers in their tenant" ON public.customers;

DROP POLICY IF EXISTS "Users can view customer_addresses from their tenant" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can create customer_addresses in their tenant" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can update customer_addresses in their tenant" ON public.customer_addresses;
DROP POLICY IF EXISTS "Users can delete customer_addresses in their tenant" ON public.customer_addresses;

DROP POLICY IF EXISTS "Users can view customer_vehicles from their tenant" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can create customer_vehicles in their tenant" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can update customer_vehicles in their tenant" ON public.customer_vehicles;
DROP POLICY IF EXISTS "Users can delete customer_vehicles in their tenant" ON public.customer_vehicles;

DROP POLICY IF EXISTS "Users can view customer_items from their tenant" ON public.customer_items;
DROP POLICY IF EXISTS "Users can create customer_items in their tenant" ON public.customer_items;
DROP POLICY IF EXISTS "Users can update customer_items in their tenant" ON public.customer_items;
DROP POLICY IF EXISTS "Users can delete customer_items in their tenant" ON public.customer_items;

-- Customers RLS: CRUD only when tenant_id = current_tenant_id()
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

-- Customer Addresses RLS: CRUD only when customer belongs to current tenant
CREATE POLICY "Users can view customer_addresses from their tenant" 
ON public.customer_addresses FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_addresses.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can create customer_addresses in their tenant" 
ON public.customer_addresses FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_addresses.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can update customer_addresses in their tenant" 
ON public.customer_addresses FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_addresses.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can delete customer_addresses in their tenant" 
ON public.customer_addresses FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_addresses.customer_id 
  AND c.tenant_id = current_tenant_id()
));

-- Customer Vehicles RLS: CRUD only when customer belongs to current tenant
CREATE POLICY "Users can view customer_vehicles from their tenant" 
ON public.customer_vehicles FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_vehicles.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can create customer_vehicles in their tenant" 
ON public.customer_vehicles FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_vehicles.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can update customer_vehicles in their tenant" 
ON public.customer_vehicles FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_vehicles.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can delete customer_vehicles in their tenant" 
ON public.customer_vehicles FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_vehicles.customer_id 
  AND c.tenant_id = current_tenant_id()
));

-- Customer Items RLS: CRUD only when customer belongs to current tenant
CREATE POLICY "Users can view customer_items from their tenant" 
ON public.customer_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_items.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can create customer_items in their tenant" 
ON public.customer_items FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_items.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can update customer_items from their tenant" 
ON public.customer_items FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_items.customer_id 
  AND c.tenant_id = current_tenant_id()
));

CREATE POLICY "Users can delete customer_items in their tenant" 
ON public.customer_items FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.customers c 
  WHERE c.id = customer_items.customer_id 
  AND c.tenant_id = current_tenant_id()
));