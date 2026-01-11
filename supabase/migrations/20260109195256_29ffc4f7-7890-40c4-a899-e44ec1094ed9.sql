-- Corrigir função complete_checkout para criar customer_items
CREATE OR REPLACE FUNCTION public.complete_checkout(
  p_buyer_tenant_id uuid,
  p_service_id uuid,
  p_payment_method text,
  p_amount numeric,
  p_coupon_code text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _service record;
  _coupon record;
  _discount_amount numeric := 0;
  _final_amount numeric;
  _subscription_id uuid;
  _payment_id uuid;
  _customer_item_id uuid;
  _customer_id uuid;
  _end_date timestamp with time zone;
BEGIN
  -- Buscar serviço
  SELECT * INTO _service FROM services WHERE id = p_service_id AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Serviço não encontrado ou inativo');
  END IF;

  -- Definir customer_id
  _customer_id := p_customer_id;

  -- Calcular data de término baseada na duração do serviço
  IF _service.duration_months IS NOT NULL AND _service.duration_months > 0 THEN
    _end_date := now() + (_service.duration_months || ' months')::interval;
  ELSE
    _end_date := now() + interval '1 month';
  END IF;

  -- Processar cupom se fornecido
  IF p_coupon_code IS NOT NULL AND p_coupon_code != '' THEN
    SELECT * INTO _coupon 
    FROM coupons 
    WHERE code = UPPER(p_coupon_code) 
      AND active = true 
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_redemptions IS NULL OR (
        SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = coupons.id
      ) < max_redemptions);
    
    IF FOUND THEN
      IF _coupon.discount_type = 'percentage' THEN
        _discount_amount := (p_amount * _coupon.discount_value / 100);
      ELSE
        _discount_amount := _coupon.discount_value;
      END IF;
    END IF;
  END IF;

  _final_amount := GREATEST(p_amount - _discount_amount, 0);

  -- Criar subscription
  INSERT INTO subscriptions (
    buyer_tenant_id,
    service_id,
    status,
    start_date,
    end_date,
    amount,
    discount_amount
  )
  VALUES (
    p_buyer_tenant_id,
    p_service_id,
    'active',
    now(),
    _end_date,
    _final_amount,
    _discount_amount
  )
  RETURNING id INTO _subscription_id;

  -- Criar payment
  INSERT INTO payments (
    buyer_tenant_id,
    service_id,
    subscription_id,
    amount,
    discount_amount,
    payment_method,
    status,
    paid_at
  )
  VALUES (
    p_buyer_tenant_id,
    p_service_id,
    _subscription_id,
    _final_amount,
    _discount_amount,
    p_payment_method,
    'completed',
    now()
  )
  RETURNING id INTO _payment_id;

  -- CORREÇÃO: Criar customer_item se temos customer_id
  IF _customer_id IS NOT NULL THEN
    INSERT INTO customer_items (
      customer_id,
      product_name,
      plan_name,
      price,
      status,
      due_date,
      starts_at,
      expires_at,
      discount
    )
    VALUES (
      _customer_id,
      _service.name,
      _service.name,
      _final_amount,
      'active',
      _end_date::date,
      now(),
      _end_date,
      COALESCE(_discount_amount, 0)
    )
    RETURNING id INTO _customer_item_id;
  END IF;

  -- Registrar uso do cupom
  IF _coupon.id IS NOT NULL THEN
    INSERT INTO coupon_redemptions (coupon_id, buyer_tenant_id, payment_id)
    VALUES (_coupon.id, p_buyer_tenant_id, _payment_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', _subscription_id,
    'payment_id', _payment_id,
    'customer_item_id', _customer_item_id,
    'final_amount', _final_amount,
    'discount_amount', _discount_amount
  );
END;
$$;