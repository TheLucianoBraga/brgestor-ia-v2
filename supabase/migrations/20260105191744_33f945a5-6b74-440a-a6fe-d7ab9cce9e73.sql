-- Atualizar a função create_customer_with_auth para criar ref_code automaticamente
CREATE OR REPLACE FUNCTION public.create_customer_with_auth(
  p_tenant_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_password TEXT,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_trial_days INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_client_tenant_id UUID;
  v_user_id UUID;
  v_parent_tenant RECORD;
  v_trial_ends_at TIMESTAMP;
  v_tenant_type TEXT;
  v_tenant_status TEXT;
  v_member_status TEXT;
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

  -- Determinar tipo de conta baseado em trial_days
  IF p_trial_days IS NOT NULL AND p_trial_days > 0 THEN
    -- É cadastro de REVENDA com trial
    v_trial_ends_at := NOW() + (p_trial_days || ' days')::interval;
    v_tenant_type := 'revenda';
    v_tenant_status := 'trial';
    v_member_status := 'active';
  ELSE
    -- É cadastro de CLIENTE normal (pendente)
    v_tenant_type := 'cliente';
    v_tenant_status := 'pending';
    v_member_status := 'pending';
  END IF;

  -- 1. Criar o customer
  INSERT INTO customers (
    tenant_id, full_name, email, whatsapp, cpf_cnpj, birth_date, notes, 
    status
  ) VALUES (
    p_tenant_id, p_full_name, p_email, p_whatsapp, p_cpf_cnpj, p_birth_date, p_notes, 
    CASE WHEN v_tenant_type = 'revenda' THEN 'active' ELSE 'pending' END
  ) RETURNING id INTO v_customer_id;

  -- 2. Criar tenant do tipo apropriado
  INSERT INTO tenants (
    name, type, parent_tenant_id, owner_tenant_id, status, trial_ends_at
  ) VALUES (
    p_full_name, v_tenant_type, p_tenant_id, p_tenant_id, v_tenant_status, v_trial_ends_at
  ) RETURNING id INTO v_client_tenant_id;

  -- 3. Atualizar customer com referência ao tenant
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
    extensions.crypt(p_password, extensions.gen_salt('bf')),
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

  -- 7. Criar tenant_member
  INSERT INTO tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (v_client_tenant_id, v_user_id, 'admin', v_member_status);

  -- 8. NOVO: Criar ref_code automaticamente para o novo tenant
  INSERT INTO ref_codes (owner_tenant_id, kind)
  VALUES (v_client_tenant_id, 'signup_cliente');
  
  RETURN json_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'tenant_id', v_client_tenant_id,
    'user_id', v_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;