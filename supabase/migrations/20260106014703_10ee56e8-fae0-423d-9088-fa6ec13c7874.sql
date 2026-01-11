-- Limpar profiles órfãos (usando user_id)
DELETE FROM profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Limpar tenant_members órfãos
DELETE FROM tenant_members 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Recriar função com verificação completa
DROP FUNCTION IF EXISTS public.create_customer_with_auth(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER,TEXT,TEXT);

CREATE OR REPLACE FUNCTION public.create_customer_with_auth(
  p_tenant_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_password TEXT,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_trial_days INTEGER DEFAULT 0,
  p_account_name TEXT DEFAULT NULL,
  p_pix_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_customer_id UUID;
  v_tenant_id UUID;
  v_clean_email TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(p_email));
  
  -- Verificar em auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_clean_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este email já possui conta. Faça login.');
  END IF;
  
  -- Verificar em customers
  IF EXISTS (SELECT 1 FROM customers WHERE LOWER(email) = v_clean_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este email já está cadastrado como cliente.');
  END IF;

  v_user_id := gen_random_uuid();
  v_tenant_id := gen_random_uuid();
  v_customer_id := gen_random_uuid();

  -- 1. Auth user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_clean_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    NOW(), NOW(), 'authenticated', 'authenticated'
  );

  -- 2. Tenant
  INSERT INTO tenants (id, name, type, parent_tenant_id, owner_tenant_id, status, created_at)
  VALUES (v_tenant_id, COALESCE(NULLIF(p_account_name,''), p_full_name), 'cliente', p_tenant_id, p_tenant_id, 'active', NOW());

  -- 3. Profile
  INSERT INTO profiles (user_id, full_name, current_tenant_id)
  VALUES (v_user_id, p_full_name, v_tenant_id);

  -- 4. Tenant member
  INSERT INTO tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (v_tenant_id, v_user_id, 'owner', 'active');

  -- 5. Customer
  INSERT INTO customers (id, tenant_id, customer_tenant_id, full_name, email, whatsapp, cpf_cnpj, birth_date, notes, status)
  VALUES (v_customer_id, p_tenant_id, v_tenant_id, p_full_name, v_clean_email, p_whatsapp, NULLIF(p_cpf_cnpj,''), p_birth_date, p_notes, 'active');

  RETURN jsonb_build_object(
    'success', true, 
    'user_id', v_user_id, 
    'customer_id', v_customer_id, 
    'tenant_id', v_tenant_id,
    'message', 'Conta criada com sucesso!'
  );

EXCEPTION WHEN OTHERS THEN
  BEGIN
    DELETE FROM tenant_members WHERE user_id = v_user_id;
    DELETE FROM profiles WHERE user_id = v_user_id;
    DELETE FROM tenants WHERE id = v_tenant_id;
    DELETE FROM customers WHERE id = v_customer_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_with_auth(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER,TEXT,TEXT) TO anon, authenticated, service_role;