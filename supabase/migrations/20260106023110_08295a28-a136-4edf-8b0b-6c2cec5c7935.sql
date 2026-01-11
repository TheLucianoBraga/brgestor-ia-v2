
-- Corrigir função customer_subscribe_service para:
-- 1. PERMITIR clientes pendentes contratarem
-- 2. ATIVAR cliente automaticamente ao contratar

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
  
  RETURN json_build_object(
    'success', true,
    'customer_item_id', v_customer_item_id,
    'customer_id', v_customer.id,
    'customer_name', v_customer.full_name,
    'customer_whatsapp', v_customer.whatsapp,
    'service_name', v_service.name,
    'price', v_service.price,
    'due_date', v_due_date,
    'activated', v_customer.status = 'pending'
  );
END;
$function$;
