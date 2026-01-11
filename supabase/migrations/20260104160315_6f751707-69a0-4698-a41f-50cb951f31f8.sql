-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('recurring', 'one_time')),
  interval TEXT CHECK (interval IS NULL OR interval IN ('monthly', 'yearly')),
  price NUMERIC(12, 2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT services_recurring_interval_required CHECK (billing_type = 'one_time' OR (billing_type = 'recurring' AND interval IS NOT NULL))
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services

-- MASTER/ADM/REVENDA can view their own services
CREATE POLICY "Sellers can view own services"
ON public.services
FOR SELECT
USING (seller_tenant_id = current_tenant_id());

-- MASTER/ADM/REVENDA can create services
CREATE POLICY "Sellers can create services"
ON public.services
FOR INSERT
WITH CHECK (seller_tenant_id = current_tenant_id());

-- MASTER/ADM/REVENDA can update their own services
CREATE POLICY "Sellers can update own services"
ON public.services
FOR UPDATE
USING (seller_tenant_id = current_tenant_id())
WITH CHECK (seller_tenant_id = current_tenant_id());

-- MASTER/ADM/REVENDA can delete their own services
CREATE POLICY "Sellers can delete own services"
ON public.services
FOR DELETE
USING (seller_tenant_id = current_tenant_id());

-- CLIENTE can view services from their owner_tenant_id
CREATE POLICY "Clients can view owner services"
ON public.services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = current_tenant_id()
      AND t.type = 'cliente'
      AND t.owner_tenant_id = services.seller_tenant_id
      AND services.active = true
  )
);