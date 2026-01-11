-- Garantir que a extensão pgcrypto está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Dropar funções que têm tipo de retorno diferente
DROP FUNCTION IF EXISTS public.create_customer_auth_only(uuid, text, text);
DROP FUNCTION IF EXISTS public.update_customer_password(uuid, text);
DROP FUNCTION IF EXISTS public.authenticate_customer(text, text);

-- Recriar função register_portal_customer usando extensions.crypt e extensions.gen_salt
DROP FUNCTION IF EXISTS public.register_portal_customer(uuid, text, text, text, text, text, text, text, bigint);
DROP FUNCTION IF EXISTS public.register_portal_customer(uuid, text, text, text, text, text, text, text, integer);

CREATE FUNCTION public.register_portal_customer(
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

  -- Gerar hash da senha usando pgcrypto do schema extensions
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Buscar link de indicação pelo código (se fornecido)
  IF p_ref_code IS NOT NULL THEN
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
  RETURN jsonb_build_object('success', false, 'error', 'Não foi possível concluir o cadastro. Tente novamente.');
END;
$function$;

-- Recriar função create_customer_with_auth usando extensions.crypt e extensions.gen_salt
CREATE OR REPLACE FUNCTION public.create_customer_with_auth(
  p_tenant_id uuid,
  p_full_name text,
  p_email text,
  p_whatsapp text,
  p_password text,
  p_cpf_cnpj text DEFAULT NULL,
  p_birth_date text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_pix_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM customer_auth WHERE email = LOWER(p_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este e-mail já está cadastrado no sistema.');
  END IF;

  -- Verificar se WhatsApp já existe no mesmo tenant
  IF EXISTS (SELECT 1 FROM customers WHERE whatsapp = p_whatsapp AND tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este WhatsApp já está cadastrado.');
  END IF;

  -- Gerar hash da senha usando extensions schema
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Criar cliente
  INSERT INTO customers (
    tenant_id,
    full_name,
    email,
    whatsapp,
    cpf_cnpj,
    birth_date,
    notes,
    pix_key,
    status
  ) VALUES (
    p_tenant_id,
    p_full_name,
    LOWER(p_email),
    p_whatsapp,
    NULLIF(p_cpf_cnpj, ''),
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
    p_notes,
    p_pix_key,
    'active'
  )
  RETURNING id INTO v_customer_id;

  -- Criar autenticação
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

  -- Criar link de indicação
  INSERT INTO customer_referral_links (customer_id, tenant_id)
  VALUES (v_customer_id, p_tenant_id);

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Não foi possível criar o cliente. Tente novamente.');
END;
$function$;

-- Criar função create_customer_auth_only usando extensions.crypt e extensions.gen_salt
CREATE FUNCTION public.create_customer_auth_only(
  p_customer_id uuid,
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- Verificar se já existe auth para este cliente
  IF EXISTS (SELECT 1 FROM customer_auth WHERE customer_id = p_customer_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente já possui acesso ao portal.');
  END IF;

  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM customer_auth WHERE email = LOWER(p_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este e-mail já está em uso.');
  END IF;

  -- Gerar hash usando extensions schema
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Criar auth
  INSERT INTO customer_auth (
    customer_id,
    email,
    password_hash,
    plain_password,
    is_active
  ) VALUES (
    p_customer_id,
    LOWER(p_email),
    v_password_hash,
    p_password,
    true
  );

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Não foi possível criar o acesso. Tente novamente.');
END;
$function$;

-- Criar função update_customer_password usando extensions.crypt e extensions.gen_salt
CREATE FUNCTION public.update_customer_password(
  p_customer_id uuid,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- Gerar hash usando extensions schema
  v_password_hash := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

  -- Atualizar senha
  UPDATE customer_auth
  SET password_hash = v_password_hash,
      plain_password = p_new_password
  WHERE customer_id = p_customer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado.');
  END IF;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Não foi possível atualizar a senha. Tente novamente.');
END;
$function$;

-- Criar função authenticate_customer usando extensions.crypt
CREATE FUNCTION public.authenticate_customer(
  _email text,
  _password_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth RECORD;
  v_customer RECORD;
BEGIN
  -- Buscar auth pelo email
  SELECT * INTO v_auth
  FROM customer_auth
  WHERE email = LOWER(_email)
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'E-mail ou senha incorretos.');
  END IF;

  -- Verificar senha usando extensions.crypt ou plain_password
  IF v_auth.password_hash != extensions.crypt(_password_hash, v_auth.password_hash) 
     AND v_auth.plain_password != _password_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'E-mail ou senha incorretos.');
  END IF;

  -- Buscar dados do cliente
  SELECT * INTO v_customer
  FROM customers
  WHERE id = v_auth.customer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não encontrado.');
  END IF;
  
  IF v_customer.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta inativa. Aguarde aprovação.');
  END IF;

  -- Atualizar último login
  UPDATE customer_auth SET last_login = NOW() WHERE id = v_auth.id;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer.id,
    'customer_name', v_customer.full_name,
    'tenant_id', v_customer.tenant_id,
    'email', v_auth.email
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Erro ao autenticar. Tente novamente.');
END;
$function$;