-- Add trial_ends_at to tenants table for tracking trial period
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Update create_customer_with_auth to support trial period
CREATE OR REPLACE FUNCTION public.create_customer_with_auth(
  p_tenant_id uuid, 
  p_full_name text, 
  p_email text, 
  p_whatsapp text, 
  p_password text, 
  p_cpf_cnpj text DEFAULT NULL::text, 
  p_birth_date date DEFAULT NULL::date, 
  p_notes text DEFAULT NULL::text,
  p_trial_days integer DEFAULT NULL::integer
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
  v_trial_ends_at TIMESTAMP;
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

  -- Calcular trial_ends_at se for trial
  IF p_trial_days IS NOT NULL AND p_trial_days > 0 THEN
    v_trial_ends_at := NOW() + (p_trial_days || ' days')::interval;
  END IF;

  -- 1. Criar o customer com status PENDENTE
  INSERT INTO customers (
    tenant_id, full_name, email, whatsapp, cpf_cnpj, birth_date, notes, status
  ) VALUES (
    p_tenant_id, p_full_name, p_email, p_whatsapp, p_cpf_cnpj, p_birth_date, p_notes, 'pending'
  ) RETURNING id INTO v_customer_id;

  -- 2. Criar tenant do tipo 'cliente' com status PENDENTE
  INSERT INTO tenants (
    name, type, parent_tenant_id, owner_tenant_id, status, trial_ends_at
  ) VALUES (
    p_full_name, 'cliente', p_tenant_id, p_tenant_id, 'pending', v_trial_ends_at
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

  -- 8. Criar notificação para o tenant dono
  INSERT INTO notifications (tenant_id, user_id, title, message, type, reference_id, reference_type)
  SELECT 
    p_tenant_id,
    tm.user_id,
    'Novo cadastro aguardando aprovação',
    'O cliente ' || p_full_name || ' se cadastrou e está aguardando aprovação.',
    'novo_cliente',
    v_customer_id,
    'customer'
  FROM tenant_members tm
  WHERE tm.tenant_id = p_tenant_id AND tm.status = 'active';
  
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

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;