-- Função para registrar clientes do portal (sem Supabase Auth)
CREATE OR REPLACE FUNCTION public.register_portal_customer(
  p_tenant_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_password TEXT,
  p_cpf_cnpj TEXT DEFAULT NULL,
  p_birth_date TEXT DEFAULT NULL,
  p_pix_key TEXT DEFAULT NULL,
  p_ref_code INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_password_hash TEXT;
  v_referrer_link_id UUID;
  v_referrer_customer_id UUID;
BEGIN
  -- Verificar se email já existe em customer_auth
  IF EXISTS (SELECT 1 FROM customer_auth WHERE email = LOWER(p_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este e-mail já está cadastrado.');
  END IF;
  
  -- Verificar se whatsapp já existe no mesmo tenant
  IF EXISTS (SELECT 1 FROM customers WHERE whatsapp = p_whatsapp AND tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este WhatsApp já está cadastrado.');
  END IF;

  -- Gerar hash da senha usando pgcrypto
  v_password_hash := crypt(p_password, gen_salt('bf'));

  -- Buscar link de indicação pelo código (se fornecido)
  IF p_ref_code IS NOT NULL THEN
    SELECT id, customer_id INTO v_referrer_link_id, v_referrer_customer_id
    FROM referral_links
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
    notes
  ) VALUES (
    p_tenant_id,
    p_full_name,
    LOWER(p_email),
    p_whatsapp,
    NULLIF(p_cpf_cnpj, ''),
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
    p_pix_key,
    'active',
    'Cadastro via link de cliente (portal)'
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
    p_password, -- armazenar temporariamente para exibição ao gestor
    true
  );

  -- Se tiver indicador, registrar na tabela de indicações
  IF v_referrer_link_id IS NOT NULL THEN
    INSERT INTO customer_referrals (
      referral_link_id,
      referred_customer_id,
      status
    ) VALUES (
      v_referrer_link_id,
      v_customer_id,
      'pending'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'status', 'active',
    'message', 'Conta criada com sucesso! Faça login no portal.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;