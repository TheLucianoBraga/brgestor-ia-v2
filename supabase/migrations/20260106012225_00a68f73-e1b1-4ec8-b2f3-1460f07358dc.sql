-- Update function to use gen_salt from extensions schema
CREATE OR REPLACE FUNCTION public.create_customer_with_auth(
  p_tenant_id uuid,
  p_full_name text,
  p_email text,
  p_whatsapp text,
  p_password text,
  p_cpf_cnpj text DEFAULT NULL,
  p_birth_date text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_trial_days integer DEFAULT NULL,
  p_account_name text DEFAULT NULL,
  p_pix_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_customer_id UUID;
  v_tenant_id UUID;
  v_tenant_type TEXT;
  v_tenant_status TEXT;
  v_tenant_name TEXT;
  v_ref_code BIGINT;
  v_error_detail TEXT;
BEGIN
  -- Verificar se o tenant existe
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant não encontrado');
  END IF;

  -- Verificar se email já está cadastrado como customer (apenas se email foi fornecido)
  IF p_email IS NOT NULL AND p_email != '' THEN
    IF EXISTS (SELECT 1 FROM public.customers WHERE email = p_email AND email != '') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este email já está cadastrado como cliente');
    END IF;

    -- Verificar se email já existe no auth
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este email já possui uma conta. Faça login.');
    END IF;
  END IF;

  -- Criar usuário no auth
  v_user_id := extensions.uuid_generate_v4();
  
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      aud,
      role
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name),
      now(),
      now(),
      '',
      'authenticated',
      'authenticated'
    );
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Este email já possui uma conta registrada');
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_detail = PG_EXCEPTION_DETAIL;
      RETURN jsonb_build_object('success', false, 'error', 'Erro ao criar usuário: ' || SQLERRM);
  END;

  -- Determinar tipo e status do tenant baseado em trial_days
  IF p_trial_days IS NOT NULL AND p_trial_days > 0 THEN
    v_tenant_type := 'revenda';
    v_tenant_status := 'trial';
    v_tenant_name := COALESCE(NULLIF(p_account_name, ''), p_full_name);
  ELSE
    v_tenant_type := 'cliente';
    v_tenant_status := 'pending';
    v_tenant_name := p_full_name;
  END IF;

  -- Criar tenant para o customer
  BEGIN
    INSERT INTO public.tenants (
      name,
      parent_tenant_id,
      owner_tenant_id,
      type,
      status,
      trial_ends_at
    ) VALUES (
      v_tenant_name,
      p_tenant_id,
      p_tenant_id,
      v_tenant_type,
      v_tenant_status,
      CASE WHEN p_trial_days IS NOT NULL AND p_trial_days > 0 
           THEN now() + (p_trial_days || ' days')::interval 
           ELSE NULL 
      END
    )
    RETURNING id INTO v_tenant_id;
  EXCEPTION
    WHEN OTHERS THEN
      DELETE FROM auth.users WHERE id = v_user_id;
      RETURN jsonb_build_object('success', false, 'error', 'Erro ao criar conta: ' || SQLERRM);
  END;

  -- Criar profile
  INSERT INTO public.profiles (user_id, full_name, current_tenant_id)
  VALUES (v_user_id, p_full_name, v_tenant_id);

  -- Criar tenant_member como owner
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_user_id, 'owner');

  -- Criar customer vinculado ao tenant pai
  INSERT INTO public.customers (
    tenant_id,
    customer_tenant_id,
    full_name,
    email,
    whatsapp,
    cpf_cnpj,
    birth_date,
    notes,
    status
  ) VALUES (
    p_tenant_id,
    v_tenant_id,
    p_full_name,
    COALESCE(NULLIF(p_email, ''), ''),
    p_whatsapp,
    NULLIF(p_cpf_cnpj, ''),
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' 
         THEN p_birth_date::date 
         ELSE NULL 
    END,
    COALESCE(p_notes, '') || CASE WHEN p_pix_key IS NOT NULL AND p_pix_key != '' 
                                   THEN ' | PIX: ' || p_pix_key 
                                   ELSE '' 
                              END,
    'pending'
  )
  RETURNING id INTO v_customer_id;

  -- Gerar ref_code único
  v_ref_code := floor(random() * 9000000000 + 1000000000)::bigint;
  
  WHILE EXISTS (SELECT 1 FROM public.ref_codes WHERE code = v_ref_code) LOOP
    v_ref_code := floor(random() * 9000000000 + 1000000000)::bigint;
  END LOOP;
  
  INSERT INTO public.ref_codes (code, kind, owner_tenant_id, payload, active)
  VALUES (
    v_ref_code, 
    'signup_cliente', 
    v_tenant_id,
    jsonb_build_object('pix_key', p_pix_key, 'customer_id', v_customer_id),
    true
  );

  INSERT INTO public.referral_links (tenant_id, ref_code, commission_type, commission_value, is_active)
  VALUES (v_tenant_id, v_ref_code, 'percentage', 10, true)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'tenant_id', v_tenant_id,
    'user_id', v_user_id,
    'ref_code', v_ref_code
  );

EXCEPTION
  WHEN OTHERS THEN
    IF v_user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = v_user_id;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Erro inesperado: ' || SQLERRM);
END;
$$;