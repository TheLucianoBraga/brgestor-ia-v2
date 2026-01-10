-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  seller_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  subscription_id UUID NULL REFERENCES public.subscriptions(id),
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled')),
  due_date DATE NULL,
  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments RLS policies
CREATE POLICY "Sellers can view sold payments"
ON public.payments FOR SELECT
USING (seller_tenant_id = current_tenant_id());

CREATE POLICY "Buyers can view own payments"
ON public.payments FOR SELECT
USING (buyer_tenant_id = current_tenant_id());

CREATE POLICY "Sellers can create payments"
ON public.payments FOR INSERT
WITH CHECK (seller_tenant_id = current_tenant_id());

CREATE POLICY "Buyers can create own payments"
ON public.payments FOR INSERT
WITH CHECK (buyer_tenant_id = current_tenant_id());

CREATE POLICY "Sellers can update sold payments"
ON public.payments FOR UPDATE
USING (seller_tenant_id = current_tenant_id())
WITH CHECK (seller_tenant_id = current_tenant_id());

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issuer_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL,
  max_redemptions INTEGER NULL,
  expires_at TIMESTAMPTZ NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Coupons RLS policies
CREATE POLICY "Issuers can view own coupons"
ON public.coupons FOR SELECT
USING (issuer_tenant_id = current_tenant_id());

CREATE POLICY "Issuers can create coupons"
ON public.coupons FOR INSERT
WITH CHECK (issuer_tenant_id = current_tenant_id());

CREATE POLICY "Issuers can update own coupons"
ON public.coupons FOR UPDATE
USING (issuer_tenant_id = current_tenant_id())
WITH CHECK (issuer_tenant_id = current_tenant_id());

CREATE POLICY "Issuers can delete own coupons"
ON public.coupons FOR DELETE
USING (issuer_tenant_id = current_tenant_id());

-- Buyers can validate coupons from their owner tenant
CREATE POLICY "Buyers can validate owner coupons"
ON public.coupons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = current_tenant_id()
      AND t.owner_tenant_id = coupons.issuer_tenant_id
      AND coupons.active = true
  )
);

-- Create coupon_redemptions table
CREATE TABLE public.coupon_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id),
  payment_id UUID NOT NULL REFERENCES public.payments(id),
  buyer_tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on coupon_redemptions
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Coupon redemptions RLS policies
CREATE POLICY "Issuers can view redemptions of own coupons"
ON public.coupon_redemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.coupons c
    WHERE c.id = coupon_redemptions.coupon_id
      AND c.issuer_tenant_id = current_tenant_id()
  )
);

CREATE POLICY "Buyers can view own redemptions"
ON public.coupon_redemptions FOR SELECT
USING (buyer_tenant_id = current_tenant_id());

CREATE POLICY "Buyers can create redemptions"
ON public.coupon_redemptions FOR INSERT
WITH CHECK (buyer_tenant_id = current_tenant_id());

-- Function to validate and apply coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(_code TEXT, _seller_tenant_id UUID, _amount NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon RECORD;
  _redemption_count INTEGER;
  _discount NUMERIC;
  _final_amount NUMERIC;
BEGIN
  -- Find coupon
  SELECT * INTO _coupon
  FROM public.coupons
  WHERE code = _code
    AND active = true
    AND issuer_tenant_id = _seller_tenant_id;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Cupom inválido ou não aplicável');
  END IF;

  -- Check expiration
  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'Cupom expirado');
  END IF;

  -- Check max redemptions
  IF _coupon.max_redemptions IS NOT NULL THEN
    SELECT COUNT(*) INTO _redemption_count
    FROM public.coupon_redemptions
    WHERE coupon_id = _coupon.id;

    IF _redemption_count >= _coupon.max_redemptions THEN
      RETURN json_build_object('valid', false, 'error', 'Cupom esgotado');
    END IF;
  END IF;

  -- Calculate discount
  IF _coupon.discount_type = 'percent' THEN
    _discount := _amount * (_coupon.discount_value / 100);
  ELSE
    _discount := _coupon.discount_value;
  END IF;

  -- Ensure discount doesn't exceed amount
  IF _discount > _amount THEN
    _discount := _amount;
  END IF;

  _final_amount := _amount - _discount;

  RETURN json_build_object(
    'valid', true,
    'coupon_id', _coupon.id,
    'discount_type', _coupon.discount_type,
    'discount_value', _coupon.discount_value,
    'discount_amount', _discount,
    'final_amount', _final_amount
  );
END;
$$;

-- Function to complete checkout
CREATE OR REPLACE FUNCTION public.complete_checkout(
  _service_id UUID,
  _coupon_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _buyer_tenant_id UUID;
  _service RECORD;
  _coupon_result JSON;
  _final_amount NUMERIC;
  _discount_amount NUMERIC;
  _coupon_id UUID;
  _subscription_id UUID;
  _payment_id UUID;
BEGIN
  _buyer_tenant_id := current_tenant_id();

  IF _buyer_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tenant não selecionado');
  END IF;

  -- Get service
  SELECT * INTO _service
  FROM public.services
  WHERE id = _service_id AND active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Serviço não encontrado');
  END IF;

  _final_amount := _service.price;
  _discount_amount := 0;

  -- Validate and apply coupon if provided
  IF _coupon_code IS NOT NULL AND _coupon_code != '' THEN
    _coupon_result := validate_coupon(_coupon_code, _service.seller_tenant_id, _service.price);

    IF NOT (_coupon_result->>'valid')::boolean THEN
      RETURN json_build_object('success', false, 'error', _coupon_result->>'error');
    END IF;

    _final_amount := (_coupon_result->>'final_amount')::numeric;
    _discount_amount := (_coupon_result->>'discount_amount')::numeric;
    _coupon_id := (_coupon_result->>'coupon_id')::uuid;
  END IF;

  -- Create subscription
  INSERT INTO public.subscriptions (
    buyer_tenant_id,
    seller_tenant_id,
    service_id,
    kind,
    price,
    interval,
    status,
    starts_at
  )
  VALUES (
    _buyer_tenant_id,
    _service.seller_tenant_id,
    _service_id,
    'service',
    _final_amount,
    _service.interval,
    'pending',
    now()
  )
  RETURNING id INTO _subscription_id;

  -- Create payment
  INSERT INTO public.payments (
    buyer_tenant_id,
    seller_tenant_id,
    subscription_id,
    amount,
    status,
    due_date
  )
  VALUES (
    _buyer_tenant_id,
    _service.seller_tenant_id,
    _subscription_id,
    _final_amount,
    'pending',
    CURRENT_DATE + INTERVAL '7 days'
  )
  RETURNING id INTO _payment_id;

  -- Record coupon redemption if used
  IF _coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_redemptions (coupon_id, payment_id, buyer_tenant_id)
    VALUES (_coupon_id, _payment_id, _buyer_tenant_id);
  END IF;

  RETURN json_build_object(
    'success', true,
    'subscription_id', _subscription_id,
    'payment_id', _payment_id,
    'amount', _final_amount,
    'discount', _discount_amount
  );
END;
$$;

-- Function to mark payment as paid (for dev/MVP simulation)
CREATE OR REPLACE FUNCTION public.mark_payment_paid(_payment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment RECORD;
BEGIN
  -- Get payment
  SELECT * INTO _payment
  FROM public.payments
  WHERE id = _payment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pagamento não encontrado');
  END IF;

  -- Check if user is buyer
  IF _payment.buyer_tenant_id != current_tenant_id() THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  -- Update payment
  UPDATE public.payments
  SET status = 'paid', paid_at = now()
  WHERE id = _payment_id;

  -- Activate subscription if exists
  IF _payment.subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET status = 'active'
    WHERE id = _payment.subscription_id;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Pagamento confirmado');
END;
$$;