-- Fix the v_referrer field issue in approve_customer_service function
CREATE OR REPLACE FUNCTION public.approve_customer_service(
  p_customer_id UUID,
  p_service_id UUID,
  p_discount_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_service RECORD;
  v_discount RECORD;
  v_subscription_id UUID;
  v_final_price NUMERIC;
  v_discount_amount NUMERIC := 0;
  v_due_date DATE;
  v_expires_at TIMESTAMP;
  v_referrer_link RECORD;
  v_commission_amount NUMERIC;
  v_referral_link_id UUID;
  v_customer_tenant_id UUID;
BEGIN
  -- Buscar dados do cliente
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;
  
  v_customer_tenant_id := v_customer.customer_tenant_id;
  
  -- Buscar dados do serviço
  SELECT * INTO v_service FROM services WHERE id = p_service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço não encontrado';
  END IF;
  
  -- Calcular preço final
  v_final_price := v_service.price;
  
  -- Aplicar desconto se houver
  IF p_discount_id IS NOT NULL THEN
    SELECT * INTO v_discount FROM discounts WHERE id = p_discount_id AND is_active = true;
    IF FOUND THEN
      IF v_discount.discount_type = 'percentage' THEN
        v_discount_amount := v_final_price * (v_discount.discount_value / 100);
      ELSE
        v_discount_amount := v_discount.discount_value;
      END IF;
      v_final_price := GREATEST(0, v_final_price - v_discount_amount);
    END IF;
  END IF;
  
  -- Calcular data de vencimento baseado no billing_type
  v_due_date := CURRENT_DATE;
  IF v_service.billing_type = 'recurring' THEN
    v_due_date := CURRENT_DATE + (COALESCE(v_service.interval_days, 30) || ' days')::INTERVAL;
    v_expires_at := NOW() + (COALESCE(v_service.interval_days, 30) || ' days')::INTERVAL;
  END IF;
  
  -- Criar ou atualizar subscription
  INSERT INTO customer_service_subscriptions (
    customer_id,
    service_id,
    tenant_id,
    status,
    price,
    final_price,
    discount_id,
    discount_amount,
    start_date,
    next_billing_date,
    auto_renew
  ) VALUES (
    p_customer_id,
    p_service_id,
    v_service.tenant_id,
    'active',
    v_service.price,
    v_final_price,
    p_discount_id,
    v_discount_amount,
    CURRENT_DATE,
    CASE WHEN v_service.billing_type = 'recurring' THEN v_due_date ELSE NULL END,
    v_service.billing_type = 'recurring'
  )
  RETURNING id INTO v_subscription_id;
  
  -- Atualizar status do cliente para active se estiver pending
  IF v_customer.status = 'pending' THEN
    UPDATE customers SET status = 'active' WHERE id = p_customer_id;
  END IF;
  
  -- Buscar indicador através do histórico de referral
  SELECT rl.id, rl.tenant_id, rl.commission_type, rl.commission_value
  INTO v_referrer_link
  FROM referral_links rl
  JOIN referral_history rh ON rh.referral_link_id = rl.id
  WHERE rh.referred_tenant_id = v_customer_tenant_id
  AND rl.is_active = true
  LIMIT 1;
  
  -- Se não encontrou por referral_history, verificar comissão do serviço
  IF NOT FOUND AND v_service.commission_value IS NOT NULL AND v_service.commission_value > 0 THEN
    -- Verificar se o cliente veio de uma indicação pelo parent_tenant
    IF v_customer_tenant_id IS NOT NULL THEN
      -- Buscar parent_tenant_id do customer_tenant
      DECLARE
        v_parent_tenant_id UUID;
      BEGIN
        SELECT t.parent_tenant_id INTO v_parent_tenant_id
        FROM tenants t
        WHERE t.id = v_customer_tenant_id
        AND t.parent_tenant_id IS NOT NULL;
        
        IF v_parent_tenant_id IS NOT NULL THEN
          SELECT rl.id INTO v_referral_link_id
          FROM referral_links rl
          WHERE rl.tenant_id = v_parent_tenant_id
          AND rl.is_active = true
          LIMIT 1;
          
          -- Se existe referral_link, usar a comissão do serviço
          IF v_referral_link_id IS NOT NULL THEN
            v_referrer_link.id := v_referral_link_id;
            v_referrer_link.commission_type := v_service.commission_type;
            v_referrer_link.commission_value := v_service.commission_value;
          END IF;
        END IF;
      END;
    END IF;
  END IF;
  
  -- Se encontrou indicador, calcular e registrar comissão
  IF v_referrer_link.id IS NOT NULL AND v_referrer_link.commission_value IS NOT NULL AND v_referrer_link.commission_value > 0 THEN
    -- Calcular valor da comissão
    IF v_referrer_link.commission_type = 'percent' THEN
      v_commission_amount := v_service.price * (v_referrer_link.commission_value / 100);
    ELSE
      v_commission_amount := v_referrer_link.commission_value;
    END IF;
    
    -- Registrar no histórico de comissões
    INSERT INTO referral_history (
      referral_link_id,
      referred_tenant_id,
      commission_amount,
      status
    ) VALUES (
      v_referrer_link.id,
      v_customer_tenant_id,
      v_commission_amount,
      'pending'
    );
    
    -- Atualizar totais do referral_link
    UPDATE referral_links
    SET total_referrals = total_referrals + 1,
        total_earned = total_earned + v_commission_amount
    WHERE id = v_referrer_link.id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'final_price', v_final_price,
    'discount_amount', v_discount_amount,
    'due_date', v_due_date,
    'activated', v_customer.status = 'pending',
    'commission_registered', v_referrer_link.id IS NOT NULL
  );
END;
$$;