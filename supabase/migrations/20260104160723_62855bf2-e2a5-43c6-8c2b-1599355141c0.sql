-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  seller_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  service_id UUID REFERENCES public.services(id),
  plan_id UUID REFERENCES public.plans(id),
  kind TEXT NOT NULL CHECK (kind IN ('service', 'plan')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'pending')),
  price NUMERIC(12, 2) NOT NULL,
  interval TEXT CHECK (interval IS NULL OR interval IN ('monthly', 'yearly')),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Sellers can view subscriptions they sold
CREATE POLICY "Sellers can view sold subscriptions"
ON public.subscriptions
FOR SELECT
USING (seller_tenant_id = current_tenant_id());

-- Buyers can view their own subscriptions
CREATE POLICY "Buyers can view own subscriptions"
ON public.subscriptions
FOR SELECT
USING (buyer_tenant_id = current_tenant_id());

-- Sellers can create subscriptions
CREATE POLICY "Sellers can create subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (seller_tenant_id = current_tenant_id());

-- Sellers can update subscriptions they sold
CREATE POLICY "Sellers can update sold subscriptions"
ON public.subscriptions
FOR UPDATE
USING (seller_tenant_id = current_tenant_id())
WITH CHECK (seller_tenant_id = current_tenant_id());

-- Create function to check active service access
CREATE OR REPLACE FUNCTION public.has_active_service_access(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE buyer_tenant_id = _tenant_id
      AND kind = 'service'
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at > now())
  )
$$;

-- Create function to get current tenant access status (for frontend)
CREATE OR REPLACE FUNCTION public.get_current_tenant_access()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _tenant_type TEXT;
  _has_access BOOLEAN;
BEGIN
  _tenant_id := current_tenant_id();
  
  IF _tenant_id IS NULL THEN
    RETURN json_build_object('has_access', false, 'tenant_type', null);
  END IF;
  
  SELECT type INTO _tenant_type
  FROM public.tenants
  WHERE id = _tenant_id;
  
  -- Non-client tenants always have access
  IF _tenant_type != 'cliente' THEN
    RETURN json_build_object('has_access', true, 'tenant_type', _tenant_type);
  END IF;
  
  -- Check client access
  _has_access := has_active_service_access(_tenant_id);
  
  RETURN json_build_object(
    'has_access', _has_access,
    'tenant_type', _tenant_type
  );
END;
$$;