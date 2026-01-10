-- 1. Adicionar 'cliente' como tipo válido de tenant (se houver constraint)
-- Primeiro, vamos verificar e atualizar para aceitar o novo tipo

-- 2. Criar função para criar customer com autenticação
CREATE OR REPLACE FUNCTION public.create_customer_with_auth(
  p_tenant_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_password TEXT,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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

  -- 1. Criar o customer
  INSERT INTO customers (
    tenant_id, full_name, email, whatsapp, cpf_cnpj, birth_date, notes, status
  ) VALUES (
    p_tenant_id, p_full_name, p_email, p_whatsapp, p_cpf_cnpj, p_birth_date, p_notes, 'active'
  ) RETURNING id INTO v_customer_id;

  -- 2. Criar tenant do tipo 'cliente'
  INSERT INTO tenants (
    name, type, parent_tenant_id, owner_tenant_id, status
  ) VALUES (
    p_full_name, 'cliente', p_tenant_id, p_tenant_id, 'active'
  ) RETURNING id INTO v_client_tenant_id;

  -- 3. Criar usuário no auth.users
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
    NOW(), -- auto-confirm email
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', p_full_name, 'customer_id', v_customer_id),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    ''
  );

  -- 4. Criar identidade para o usuário
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

  -- 5. Criar profile
  INSERT INTO profiles (user_id, full_name, current_tenant_id)
  VALUES (v_user_id, p_full_name, v_client_tenant_id);

  -- 6. Criar tenant_member
  INSERT INTO tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (v_client_tenant_id, v_user_id, 'admin', 'active');

  -- 7. Atualizar customer com referência ao tenant cliente
  -- Adicionar coluna se não existir e atualizar
  
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

-- Adicionar coluna customer_tenant_id na tabela customers se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'customer_tenant_id'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN customer_tenant_id UUID REFERENCES tenants(id);
  END IF;
END $$;

-- Criar função para verificar se cliente tem serviço ativo
CREATE OR REPLACE FUNCTION public.customer_has_active_subscription(p_customer_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM customer_items ci
    JOIN customers c ON c.id = ci.customer_id
    WHERE c.customer_tenant_id = p_customer_tenant_id
    AND ci.status = 'active'
  );
$$;