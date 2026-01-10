
-- Atualizar função register_portal_customer para suportar indicação cliente-cliente
CREATE OR REPLACE FUNCTION public.register_portal_customer(
  p_tenant_id uuid, 
  p_full_name text, 
  p_email text, 
  p_whatsapp text, 
  p_password text, 
  p_cpf_cnpj text DEFAULT NULL::text, 
  p_birth_date text DEFAULT NULL::text, 
  p_pix_key text DEFAULT NULL::text, 
  p_ref_code bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_password_hash TEXT;
  v_referrer_customer_id UUID;
  v_referrer_link_id UUID;
BEGIN
  -- Verificar se email já existe em customer_auth
  IF EXISTS (SELECT 1 FROM customer_auth WHERE email = LOWER(p_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este e-mail já está cadastrado.');
  END IF;
  
  -- Verificar se whatsapp já existe no mesmo tenant
  IF EXISTS (SELECT 1 FROM customers WHERE whatsapp = p_whatsapp AND tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este WhatsApp já está cadastrado.');
  END IF;

  -- Gerar hash da senha usando pgcrypto
  v_password_hash := crypt(p_password, gen_salt('bf'));

  -- Buscar link de indicação pelo código (se fornecido)
  IF p_ref_code IS NOT NULL THEN
    -- Primeiro verificar se é link de indicação de cliente
    SELECT id, customer_id INTO v_referrer_link_id, v_referrer_customer_id
    FROM customer_referral_links
    WHERE ref_code = p_ref_code
    AND is_active = true
    AND tenant_id = p_tenant_id
    LIMIT 1;
  END IF;

  -- Criar registro do cliente
  INSERT INTO customers (
    tenant_id,
    full_name,
    email,
    whatsapp,
    cpf_cnpj,
    birth_date,
    pix_key,
    status,
    notes,
    referrer_customer_id
  ) VALUES (
    p_tenant_id,
    p_full_name,
    LOWER(p_email),
    p_whatsapp,
    NULLIF(p_cpf_cnpj, ''),
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
    p_pix_key,
    'active',
    CASE 
      WHEN v_referrer_customer_id IS NOT NULL THEN 'Cadastro via indicação de cliente (ref: ' || p_ref_code || ')'
      ELSE 'Cadastro via link de cliente (portal)'
    END,
    v_referrer_customer_id
  )
  RETURNING id INTO v_customer_id;

  -- Criar registro de autenticação do cliente (customer_auth)
  INSERT INTO customer_auth (
    customer_id,
    email,
    password_hash,
    plain_password,
    is_active
  ) VALUES (
    v_customer_id,
    LOWER(p_email),
    v_password_hash,
    p_password,
    true
  );

  -- Se tiver indicador cliente, registrar na tabela de indicações
  IF v_referrer_customer_id IS NOT NULL AND v_referrer_link_id IS NOT NULL THEN
    INSERT INTO customer_referrals (
      referral_link_id,
      referrer_customer_id,
      referred_customer_id,
      tenant_id,
      status
    ) VALUES (
      v_referrer_link_id,
      v_referrer_customer_id,
      v_customer_id,
      p_tenant_id,
      'pending'
    );
    
    -- Atualizar contador do link
    UPDATE customer_referral_links
    SET total_referrals = total_referrals + 1
    WHERE id = v_referrer_link_id;
  END IF;

  -- Criar link de indicação para o novo cliente
  INSERT INTO customer_referral_links (customer_id, tenant_id)
  VALUES (v_customer_id, p_tenant_id);

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'status', 'active',
    'has_referrer', v_referrer_customer_id IS NOT NULL,
    'message', 'Conta criada com sucesso! Faça login no portal.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Criar função para calcular e registrar comissão quando cliente paga serviço
CREATE OR REPLACE FUNCTION public.register_customer_referral_commission(
  p_referred_customer_id uuid,
  p_service_id uuid,
  p_subscription_id uuid,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_customer_id UUID;
  v_referral RECORD;
  v_service RECORD;
  v_commission_amount NUMERIC;
  v_tenant_id UUID;
BEGIN
  -- Buscar referrer do cliente
  SELECT referrer_customer_id, tenant_id INTO v_referrer_customer_id, v_tenant_id
  FROM customers
  WHERE id = p_referred_customer_id;
  
  IF v_referrer_customer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não foi indicado por ninguém');
  END IF;
  
  -- Buscar configuração de comissão do serviço
  SELECT * INTO v_service FROM services WHERE id = p_service_id;
  
  IF NOT FOUND OR v_service.commission_value IS NULL OR v_service.commission_value <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Serviço sem comissão configurada');
  END IF;
  
  -- Calcular comissão
  IF v_service.commission_type = 'percentage' OR v_service.commission_type = 'percent' THEN
    v_commission_amount := p_amount * (v_service.commission_value / 100);
  ELSE
    v_commission_amount := v_service.commission_value;
  END IF;
  
  -- Buscar referral link do indicador
  SELECT id INTO v_referral
  FROM customer_referral_links
  WHERE customer_id = v_referrer_customer_id
  AND tenant_id = v_tenant_id
  LIMIT 1;
  
  -- Registrar comissão
  INSERT INTO customer_referrals (
    referral_link_id,
    referrer_customer_id,
    referred_customer_id,
    tenant_id,
    service_id,
    subscription_id,
    commission_amount,
    commission_type,
    status
  ) VALUES (
    v_referral.id,
    v_referrer_customer_id,
    p_referred_customer_id,
    v_tenant_id,
    p_service_id,
    p_subscription_id,
    v_commission_amount,
    'first',
    'pending'
  );
  
  -- Atualizar totais do indicador
  UPDATE customer_referral_links
  SET total_earned = total_earned + v_commission_amount,
      available_balance = available_balance + v_commission_amount
  WHERE customer_id = v_referrer_customer_id AND tenant_id = v_tenant_id;
  
  RETURN json_build_object(
    'success', true,
    'commission_amount', v_commission_amount,
    'referrer_customer_id', v_referrer_customer_id
  );
END;
$function$;

-- Criar função para registrar comissão recorrente
CREATE OR REPLACE FUNCTION public.register_customer_recurring_commission(
  p_referred_customer_id uuid,
  p_service_id uuid,
  p_subscription_id uuid,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_customer_id UUID;
  v_referral RECORD;
  v_service RECORD;
  v_commission_amount NUMERIC;
  v_tenant_id UUID;
BEGIN
  -- Buscar referrer do cliente
  SELECT referrer_customer_id, tenant_id INTO v_referrer_customer_id, v_tenant_id
  FROM customers
  WHERE id = p_referred_customer_id;
  
  IF v_referrer_customer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não foi indicado');
  END IF;
  
  -- Buscar configuração de recorrência do serviço
  SELECT * INTO v_service FROM services WHERE id = p_service_id;
  
  IF NOT FOUND OR NOT v_service.recurrence_enabled OR v_service.recurrence_value IS NULL OR v_service.recurrence_value <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Serviço sem comissão recorrente');
  END IF;
  
  -- Calcular comissão recorrente
  IF v_service.commission_type = 'percentage' OR v_service.commission_type = 'percent' THEN
    v_commission_amount := p_amount * (v_service.recurrence_value / 100);
  ELSE
    v_commission_amount := v_service.recurrence_value;
  END IF;
  
  -- Buscar referral link do indicador
  SELECT id INTO v_referral
  FROM customer_referral_links
  WHERE customer_id = v_referrer_customer_id
  AND tenant_id = v_tenant_id
  LIMIT 1;
  
  -- Registrar comissão recorrente
  INSERT INTO customer_referrals (
    referral_link_id,
    referrer_customer_id,
    referred_customer_id,
    tenant_id,
    service_id,
    subscription_id,
    commission_amount,
    commission_type,
    status
  ) VALUES (
    v_referral.id,
    v_referrer_customer_id,
    p_referred_customer_id,
    v_tenant_id,
    p_service_id,
    p_subscription_id,
    v_commission_amount,
    'recurring',
    'pending'
  );
  
  -- Atualizar totais do indicador
  UPDATE customer_referral_links
  SET total_earned = total_earned + v_commission_amount,
      available_balance = available_balance + v_commission_amount
  WHERE customer_id = v_referrer_customer_id AND tenant_id = v_tenant_id;
  
  RETURN json_build_object(
    'success', true,
    'commission_amount', v_commission_amount,
    'referrer_customer_id', v_referrer_customer_id
  );
END;
$function$;
