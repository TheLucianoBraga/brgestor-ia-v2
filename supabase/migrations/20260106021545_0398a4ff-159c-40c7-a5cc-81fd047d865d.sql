-- Atualizar função para criar cliente como pendente (exigindo aprovação por padrão)
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
  v_customer_status TEXT;
  v_require_approval BOOLEAN;
BEGIN
  v_clean_email := LOWER(TRIM(p_email));
  v_tenant_id := gen_random_uuid();
  v_customer_id := gen_random_uuid();
  v_tenant_type := CASE WHEN p_is_revenda THEN 'revenda' ELSE 'cliente' END;

  -- Verificar se o tenant pai requer aprovação de clientes
  -- Por padrão, SEMPRE requer aprovação para clientes (não revenda)
  IF NOT p_is_revenda THEN
    SELECT COALESCE(value = 'false', FALSE) INTO v_require_approval
    FROM tenant_settings 
    WHERE tenant_id = p_tenant_id AND key = 'auto_approve_customers';
    
    -- Se não encontrou configuração, requer aprovação por padrão
    IF v_require_approval IS NULL THEN
      v_require_approval := TRUE;
    END IF;
    
    v_customer_status := CASE WHEN v_require_approval THEN 'pending' ELSE 'active' END;
  ELSE
    v_customer_status := 'active'; -- Revendas são aprovadas automaticamente
  END IF;

  -- 1. Criar tenant do cliente/revenda (status pending para clientes que precisam aprovação)
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

  -- 2. Atualizar/criar profile (trigger pode ter criado)
  INSERT INTO profiles (user_id, full_name, current_tenant_id)
  VALUES (p_user_id, p_full_name, v_tenant_id)
  ON CONFLICT (user_id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    current_tenant_id = EXCLUDED.current_tenant_id;

  -- 3. Criar tenant member (status pending para clientes que precisam aprovação)
  INSERT INTO tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (v_tenant_id, p_user_id, 'owner', CASE WHEN v_customer_status = 'pending' THEN 'pending' ELSE 'active' END);

  -- 4. Criar customer (pertence ao tenant pai) com status apropriado
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

-- Atualizar função customer_subscribe_service para verificar se cliente está ativo
CREATE OR REPLACE FUNCTION public.customer_subscribe_service(p_service_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Verificar se cliente está ativo (não pendente)
  IF v_customer.status = 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Seu cadastro está pendente de aprovação. Aguarde a liberação para contratar serviços.');
  END IF;
  
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
$$;