-- Corrigir função setup_customer_after_signup para usar 'disabled' em tenant_members
CREATE OR REPLACE FUNCTION public.setup_customer_after_signup(
  p_user_id uuid, 
  p_tenant_id uuid, 
  p_full_name text, 
  p_email text, 
  p_whatsapp text, 
  p_cpf_cnpj text DEFAULT NULL, 
  p_birth_date date DEFAULT NULL, 
  p_pix_key text DEFAULT NULL, 
  p_notes text DEFAULT NULL, 
  p_account_name text DEFAULT NULL, 
  p_is_revenda boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_customer_id UUID;
  v_tenant_type TEXT;
  v_clean_email TEXT;
  v_customer_status TEXT;
  v_require_approval BOOLEAN;
  v_member_status TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(p_email));
  v_tenant_id := gen_random_uuid();
  v_customer_id := gen_random_uuid();
  v_tenant_type := CASE WHEN p_is_revenda THEN 'revenda' ELSE 'cliente' END;

  -- Verificar se o tenant pai requer aprovação de clientes
  IF NOT p_is_revenda THEN
    SELECT COALESCE(value = 'true', FALSE) INTO v_require_approval
    FROM tenant_settings 
    WHERE tenant_id = p_tenant_id AND key = 'auto_approve_customers';
    
    -- auto_approve = true significa NÃO requer aprovação
    -- Se não encontrou configuração, requer aprovação por padrão
    v_require_approval := NOT COALESCE(v_require_approval, FALSE);
    
    v_customer_status := CASE WHEN v_require_approval THEN 'pending' ELSE 'active' END;
    v_member_status := CASE WHEN v_require_approval THEN 'disabled' ELSE 'active' END;
  ELSE
    v_customer_status := 'active';
    v_member_status := 'active';
  END IF;

  -- 1. Criar tenant do cliente/revenda
  INSERT INTO tenants (id, name, type, parent_tenant_id, owner_tenant_id, status, created_at)
  VALUES (
    v_tenant_id, 
    COALESCE(NULLIF(p_account_name,''), p_full_name), 
    v_tenant_type, 
    p_tenant_id, 
    p_tenant_id, 
    CASE WHEN v_customer_status = 'pending' THEN 'pending' ELSE 'active' END, 
    NOW()
  );

  -- 2. Atualizar/criar profile
  INSERT INTO profiles (user_id, full_name, current_tenant_id)
  VALUES (p_user_id, p_full_name, v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    current_tenant_id = EXCLUDED.current_tenant_id;

  -- 3. Criar tenant member com status apropriado
  INSERT INTO tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (v_tenant_id, p_user_id, 'owner', v_member_status);

  -- 4. Criar customer
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
    v_customer_status
  );

  RETURN jsonb_build_object(
    'success', true, 
    'user_id', p_user_id, 
    'customer_id', v_customer_id, 
    'tenant_id', v_tenant_id,
    'status', v_customer_status,
    'message', CASE WHEN v_customer_status = 'pending' 
      THEN 'Cadastro realizado! Aguarde aprovação para acessar.' 
      ELSE 'Conta configurada com sucesso!' 
    END
  );

EXCEPTION WHEN OTHERS THEN
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

-- Atualizar função approve_customer para ativar tenant_member
CREATE OR REPLACE FUNCTION public.approve_customer(p_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer RECORD;
  v_tenant_id UUID;
BEGIN
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
$$;