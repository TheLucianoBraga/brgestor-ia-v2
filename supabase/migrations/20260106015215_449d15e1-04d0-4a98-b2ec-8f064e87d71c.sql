-- Criar função simplificada que é chamada DEPOIS do signUp do Supabase Auth
-- Esta função não mexe com senha - apenas cria os registros adicionais

CREATE OR REPLACE FUNCTION public.setup_customer_after_signup(
  p_user_id UUID,
  p_tenant_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_pix_key TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_is_revenda BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_customer_id UUID;
  v_tenant_type TEXT;
  v_clean_email TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(p_email));
  v_tenant_id := gen_random_uuid();
  v_customer_id := gen_random_uuid();
  v_tenant_type := CASE WHEN p_is_revenda THEN 'revenda' ELSE 'cliente' END;

  -- 1. Criar tenant do cliente/revenda
  INSERT INTO tenants (id, name, type, parent_tenant_id, owner_tenant_id, status, created_at)
  VALUES (
    v_tenant_id, 
    COALESCE(NULLIF(p_account_name,''), p_full_name), 
    v_tenant_type, 
    p_tenant_id, 
    p_tenant_id, 
    'active', 
    NOW()
  );

  -- 2. Atualizar/criar profile (trigger pode ter criado)
  INSERT INTO profiles (user_id, full_name, current_tenant_id)
  VALUES (p_user_id, p_full_name, v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    current_tenant_id = EXCLUDED.current_tenant_id;

  -- 3. Criar tenant member
  INSERT INTO tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (v_tenant_id, p_user_id, 'owner', 'active');

  -- 4. Criar customer (pertence ao tenant pai)
  INSERT INTO customers (id, tenant_id, customer_tenant_id, full_name, email, whatsapp, cpf_cnpj, birth_date, notes, status)
  VALUES (
    v_customer_id, 
    p_tenant_id, 
    v_tenant_id, 
    p_full_name, 
    v_clean_email, 
    p_whatsapp, 
    NULLIF(p_cpf_cnpj,''), 
    p_birth_date, 
    p_notes, 
    'active'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'user_id', p_user_id, 
    'customer_id', v_customer_id, 
    'tenant_id', v_tenant_id,
    'message', 'Conta configurada com sucesso!'
  );

EXCEPTION WHEN OTHERS THEN
  -- Tentar limpar dados parciais
  BEGIN
    DELETE FROM tenant_members WHERE tenant_id = v_tenant_id;
    DELETE FROM customers WHERE id = v_customer_id;
    DELETE FROM tenants WHERE id = v_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_customer_after_signup(UUID,UUID,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT,BOOLEAN) TO anon, authenticated, service_role;