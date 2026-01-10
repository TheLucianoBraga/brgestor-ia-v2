-- Função para registrar comissão de indicação quando cliente contrata serviço
CREATE OR REPLACE FUNCTION public.customer_subscribe_service(p_service_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_tenant_id UUID;
  v_customer RECORD;
  v_service RECORD;
  v_customer_item_id UUID;
  v_due_date DATE;
  v_expires_at TIMESTAMP;
  v_referrer RECORD;
  v_commission_amount NUMERIC;
  v_referral_link_id UUID;
BEGIN
  v_customer_tenant_id := current_tenant_id();
  
  IF v_customer_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Buscar customer pelo tenant
  SELECT c.* INTO v_customer 
  FROM customers c 
  WHERE c.customer_tenant_id = v_customer_tenant_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;
  
  -- Apenas bloquear inativos (pendentes PODEM contratar)
  IF v_customer.status = 'inactive' THEN
    RETURN json_build_object('success', false, 'error', 'Sua conta está inativa. Entre em contato com o suporte.');
  END IF;
  
  -- Buscar serviço
  SELECT * INTO v_service FROM services WHERE id = p_service_id AND active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Serviço não encontrado');
  END IF;
  
  -- Calcular datas
  v_due_date := CURRENT_DATE + INTERVAL '30 days';
  
  IF v_service.duration_months IS NOT NULL AND v_service.duration_months > 0 THEN
    v_expires_at := NOW() + (v_service.duration_months || ' months')::interval;
  ELSE
    v_expires_at := NULL;
  END IF;
  
  -- Criar customer_item
  INSERT INTO customer_items (
    customer_id,
    product_name,
    plan_name,
    price,
    starts_at,
    due_date,
    expires_at,
    status
  ) VALUES (
    v_customer.id,
    v_service.name,
    v_service.short_description,
    v_service.price,
    NOW(),
    v_due_date,
    v_expires_at,
    'active'
  ) RETURNING id INTO v_customer_item_id;
  
  -- Criar subscription
  INSERT INTO subscriptions (
    buyer_tenant_id,
    seller_tenant_id,
    service_id,
    kind,
    price,
    interval,
    status,
    starts_at,
    ends_at
  ) VALUES (
    v_customer_tenant_id,
    v_service.seller_tenant_id,
    p_service_id,
    'service',
    v_service.price,
    v_service.interval,
    'active',
    NOW(),
    v_expires_at
  );
  
  -- ATIVAR CLIENTE AUTOMATICAMENTE ao contratar (se estava pending)
  IF v_customer.status = 'pending' THEN
    UPDATE customers SET status = 'active' WHERE id = v_customer.id;
    UPDATE tenants SET status = 'active' WHERE id = v_customer_tenant_id;
    UPDATE tenant_members SET status = 'active' WHERE tenant_id = v_customer_tenant_id;
  END IF;
  
  -- ========== LÓGICA DE COMISSÃO POR INDICAÇÃO ==========
  -- Verificar se existe um referral link que indicou este cliente (tenant)
  -- O cliente foi indicado pelo tenant_id que possui o referral_link
  SELECT rl.id, rl.tenant_id, rl.commission_type, rl.commission_value
  INTO v_referrer
  FROM referral_links rl
  JOIN referral_history rh ON rh.referral_link_id = rl.id
  WHERE rh.referred_tenant_id = v_customer_tenant_id
  AND rl.is_active = true
  LIMIT 1;
  
  -- Se não encontrou por referral_history, verificar se o serviço tem comissão configurada
  -- e se o parent_tenant é diferente do seller (indicação via revenda)
  IF NOT FOUND AND v_service.commission_value IS NOT NULL AND v_service.commission_value > 0 THEN
    -- Verificar se o cliente veio de uma indicação pelo parent_tenant
    SELECT t.parent_tenant_id INTO v_referrer
    FROM tenants t
    WHERE t.id = v_customer_tenant_id
    AND t.parent_tenant_id IS NOT NULL
    AND t.parent_tenant_id != v_service.seller_tenant_id;
    
    IF FOUND THEN
      -- Buscar o referral_link do parent_tenant para este serviço/tenant
      SELECT rl.id INTO v_referral_link_id
      FROM referral_links rl
      WHERE rl.tenant_id = v_referrer.parent_tenant_id
      AND rl.is_active = true
      LIMIT 1;
      
      -- Se existe referral_link, usar a comissão do serviço
      IF v_referral_link_id IS NOT NULL THEN
        v_referrer.id := v_referral_link_id;
        v_referrer.commission_type := v_service.commission_type;
        v_referrer.commission_value := v_service.commission_value;
      END IF;
    END IF;
  END IF;
  
  -- Se encontrou indicador, calcular e registrar comissão
  IF v_referrer.id IS NOT NULL AND v_referrer.commission_value IS NOT NULL AND v_referrer.commission_value > 0 THEN
    -- Calcular valor da comissão
    IF v_referrer.commission_type = 'percent' THEN
      v_commission_amount := v_service.price * (v_referrer.commission_value / 100);
    ELSE
      v_commission_amount := v_referrer.commission_value;
    END IF;
    
    -- Registrar comissão no referral_history
    INSERT INTO referral_history (
      referral_link_id,
      referred_tenant_id,
      commission_amount,
      status
    ) VALUES (
      v_referrer.id,
      v_customer_tenant_id,
      v_commission_amount,
      'pending'
    );
    
    -- Atualizar totais do referral_link
    UPDATE referral_links
    SET total_referrals = total_referrals + 1,
        total_earned = total_earned + v_commission_amount
    WHERE id = v_referrer.id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'customer_item_id', v_customer_item_id,
    'customer_id', v_customer.id,
    'customer_name', v_customer.full_name,
    'customer_whatsapp', v_customer.whatsapp,
    'service_name', v_service.name,
    'price', v_service.price,
    'due_date', v_due_date,
    'activated', v_customer.status = 'pending',
    'commission_registered', v_referrer.id IS NOT NULL
  );
END;
$function$;

-- Adicionar coluna para rastrear de qual customer_item veio a comissão
ALTER TABLE referral_history ADD COLUMN IF NOT EXISTS customer_item_id UUID REFERENCES customer_items(id);

-- Adicionar coluna para tipo de comissão (primeira ou recorrente)
ALTER TABLE referral_history ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'first' CHECK (commission_type IN ('first', 'recurring'));

-- Criar função para registrar comissão de renovação
CREATE OR REPLACE FUNCTION public.register_renewal_commission(
  p_customer_item_id UUID,
  p_payment_amount NUMERIC
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_item RECORD;
  v_customer RECORD;
  v_service RECORD;
  v_referrer RECORD;
  v_commission_amount NUMERIC;
BEGIN
  -- Buscar customer_item
  SELECT ci.*, c.customer_tenant_id
  INTO v_customer_item
  FROM customer_items ci
  JOIN customers c ON c.id = ci.customer_id
  WHERE ci.id = p_customer_item_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Item não encontrado');
  END IF;
  
  -- Verificar se o item está ativo e em dia (não vencido)
  IF v_customer_item.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Item não está ativo');
  END IF;
  
  IF v_customer_item.due_date < CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'error', 'Item vencido - sem comissão');
  END IF;
  
  -- Buscar serviço para ver se tem comissão de recorrência
  SELECT s.* INTO v_service
  FROM services s
  WHERE s.name = v_customer_item.product_name
  AND s.recurrence_enabled = true
  AND s.recurrence_value IS NOT NULL
  AND s.recurrence_value > 0
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Serviço sem comissão de recorrência');
  END IF;
  
  -- Buscar referral link que indicou este cliente
  SELECT rl.id, rl.tenant_id, rl.commission_type, rl.commission_value
  INTO v_referrer
  FROM referral_links rl
  JOIN referral_history rh ON rh.referral_link_id = rl.id
  WHERE rh.referred_tenant_id = v_customer_item.customer_tenant_id
  AND rl.is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Sem indicador encontrado');
  END IF;
  
  -- Calcular comissão de recorrência (usa o valor de recorrência do serviço)
  IF v_service.commission_type = 'percent' THEN
    v_commission_amount := p_payment_amount * (v_service.recurrence_value / 100);
  ELSE
    v_commission_amount := v_service.recurrence_value;
  END IF;
  
  -- Registrar comissão recorrente
  INSERT INTO referral_history (
    referral_link_id,
    referred_tenant_id,
    customer_item_id,
    commission_amount,
    commission_type,
    status
  ) VALUES (
    v_referrer.id,
    v_customer_item.customer_tenant_id,
    p_customer_item_id,
    v_commission_amount,
    'recurring',
    'pending'
  );
  
  -- Atualizar total do referral_link
  UPDATE referral_links
  SET total_earned = total_earned + v_commission_amount
  WHERE id = v_referrer.id;
  
  RETURN json_build_object(
    'success', true,
    'commission_amount', v_commission_amount,
    'referral_link_id', v_referrer.id
  );
END;
$function$;

-- Função para cancelar comissões pendentes quando cliente atrasa ou cancela
CREATE OR REPLACE FUNCTION public.cancel_pending_commissions(p_customer_tenant_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cancelled_count INT;
  v_cancelled_amount NUMERIC;
BEGIN
  -- Buscar total a ser cancelado
  SELECT COUNT(*), COALESCE(SUM(commission_amount), 0)
  INTO v_cancelled_count, v_cancelled_amount
  FROM referral_history
  WHERE referred_tenant_id = p_customer_tenant_id
  AND status = 'pending';
  
  -- Atualizar status das comissões para cancelado
  UPDATE referral_history
  SET status = 'cancelled'
  WHERE referred_tenant_id = p_customer_tenant_id
  AND status = 'pending';
  
  -- Subtrair do total ganho dos referral_links
  UPDATE referral_links rl
  SET total_earned = total_earned - (
    SELECT COALESCE(SUM(rh.commission_amount), 0)
    FROM referral_history rh
    WHERE rh.referral_link_id = rl.id
    AND rh.referred_tenant_id = p_customer_tenant_id
    AND rh.status = 'cancelled'
  )
  WHERE id IN (
    SELECT DISTINCT referral_link_id 
    FROM referral_history 
    WHERE referred_tenant_id = p_customer_tenant_id
  );
  
  RETURN json_build_object(
    'success', true,
    'cancelled_count', v_cancelled_count,
    'cancelled_amount', v_cancelled_amount
  );
END;
$function$;