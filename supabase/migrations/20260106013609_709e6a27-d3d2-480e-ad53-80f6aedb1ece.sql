-- ============================================
-- PASSO 1: Verificar e habilitar pgcrypto corretamente
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- PASSO 2: Dropar TODAS as versões da função
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT oid::regprocedure as func_signature
    FROM pg_proc 
    WHERE proname = 'create_customer_with_auth'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    RAISE NOTICE 'Dropada: %', r.func_signature;
  END LOOP;
END $$;

-- ============================================
-- PASSO 3: Criar função NOVA e SIMPLES
-- ============================================
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
  v_hashed_password TEXT;
BEGIN
  -- Limpar email
  v_clean_email := LOWER(TRIM(p_email));
  
  -- Gerar hash da senha usando extensions schema
  v_hashed_password := extensions.crypt(p_password, extensions.gen_salt('bf'));
  
  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_clean_email) THEN
    RETURN '{"success": false, "error": "Este email já possui uma conta"}'::jsonb;
  END IF;

  -- Gerar UUIDs
  v_user_id := gen_random_uuid();
  v_tenant_id := gen_random_uuid();
  v_customer_id := gen_random_uuid();

  -- Criar auth user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_clean_email,
    v_hashed_password,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    NOW(), NOW(), 'authenticated', 'authenticated'
  );

  -- Criar tenant
  INSERT INTO public.tenants (id, name, type, parent_tenant_id, owner_tenant_id, status, created_at)
  VALUES (v_tenant_id, COALESCE(NULLIF(p_account_name,''), p_full_name), 'cliente', p_tenant_id, p_tenant_id, 'active', NOW());

  -- Criar profile
  INSERT INTO public.profiles (user_id, full_name, current_tenant_id)
  VALUES (v_user_id, p_full_name, v_tenant_id);

  -- Criar tenant_member
  INSERT INTO public.tenant_members (tenant_id, user_id, role, status)
  VALUES (v_tenant_id, v_user_id, 'owner', 'active');

  -- Criar customer
  INSERT INTO public.customers (id, tenant_id, customer_tenant_id, full_name, email, whatsapp, cpf_cnpj, birth_date, notes, status, created_at)
  VALUES (v_customer_id, p_tenant_id, v_tenant_id, p_full_name, v_clean_email, p_whatsapp, NULLIF(p_cpf_cnpj,''), p_birth_date, p_notes, 'active', NOW());

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'customer_id', v_customer_id, 'tenant_id', v_tenant_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.create_customer_with_auth(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,INTEGER,TEXT,TEXT) TO anon, authenticated, service_role;