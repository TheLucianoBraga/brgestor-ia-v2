-- Atualizar função create_customer_with_auth para criar cliente como pendente
CREATE OR REPLACE FUNCTION public.create_customer_with_auth(
  p_tenant_id uuid, 
  p_full_name text, 
  p_email text, 
  p_whatsapp text, 
  p_password text, 
  p_cpf_cnpj text DEFAULT NULL::text, 
  p_birth_date date DEFAULT NULL::date, 
  p_notes text DEFAULT NULL::text
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_client_tenant_id UUID;
  v_user_id UUID;
  v_parent_tenant RECORD;
BEGIN
  -- Verificar se o tenant pai existe
  SELECT id, name INTO v_parent_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tenant não encontrado');
  END IF;

  -- Verificar se email já existe em customers deste tenant
  IF EXISTS (SELECT 1 FROM customers WHERE tenant_id = p_tenant_id AND email = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email já cadastrado');
  END IF;

  -- 1. Criar o customer com status PENDENTE
  INSERT INTO customers (
    tenant_id, full_name, email, whatsapp, cpf_cnpj, birth_date, notes, status
  ) VALUES (
    p_tenant_id, p_full_name, p_email, p_whatsapp, p_cpf_cnpj, p_birth_date, p_notes, 'pending'
  ) RETURNING id INTO v_customer_id;

  -- 2. Criar tenant do tipo 'cliente' com status PENDENTE
  INSERT INTO tenants (
    name, type, parent_tenant_id, owner_tenant_id, status
  ) VALUES (
    p_full_name, 'cliente', p_tenant_id, p_tenant_id, 'pending'
  ) RETURNING id INTO v_client_tenant_id;

  -- 3. Atualizar customer com referência ao tenant cliente
  UPDATE customers SET customer_tenant_id = v_client_tenant_id WHERE id = v_customer_id;

  -- 4. Criar usuário no auth.users
  v_user_id := extensions.uuid_generate_v4();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', p_full_name, 'customer_id', v_customer_id),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    ''
  );

  -- 5. Criar identidade para o usuário
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- 6. Criar profile
  INSERT INTO profiles (user_id, full_name, current_tenant_id)
  VALUES (v_user_id, p_full_name, v_client_tenant_id);

  -- 7. Criar tenant_member (com status pending)
  INSERT INTO tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (v_client_tenant_id, v_user_id, 'admin', 'pending');
  
  RETURN json_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'tenant_id', v_client_tenant_id,
    'user_id', v_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Criar função para aprovar cliente pendente
CREATE OR REPLACE FUNCTION public.approve_customer(
  p_customer_id uuid
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer RECORD;
  v_tenant_id UUID;
BEGIN
  -- Buscar cliente
  SELECT c.*, c.customer_tenant_id 
  INTO v_customer 
  FROM customers c 
  WHERE c.id = p_customer_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;
  
  IF v_customer.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não está pendente');
  END IF;
  
  v_tenant_id := v_customer.customer_tenant_id;
  
  -- Atualizar customer para ativo
  UPDATE customers SET status = 'active' WHERE id = p_customer_id;
  
  -- Atualizar tenant para ativo
  IF v_tenant_id IS NOT NULL THEN
    UPDATE tenants SET status = 'active' WHERE id = v_tenant_id;
    
    -- Atualizar tenant_member para ativo
    UPDATE tenant_members SET status = 'active' WHERE tenant_id = v_tenant_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'tenant_id', v_tenant_id,
    'customer_name', v_customer.full_name,
    'customer_whatsapp', v_customer.whatsapp
  );
END;
$function$;

-- Criar função para cliente assinar serviço
CREATE OR REPLACE FUNCTION public.customer_subscribe_service(
  p_service_id uuid
)
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
  
  RETURN json_build_object(
    'success', true,
    'customer_item_id', v_customer_item_id,
    'customer_id', v_customer.id,
    'customer_name', v_customer.full_name,
    'customer_whatsapp', v_customer.whatsapp,
    'service_name', v_service.name,
    'price', v_service.price,
    'due_date', v_due_date
  );
END;
$function$;