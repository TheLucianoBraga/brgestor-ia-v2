-- Dropar ambas as versões da função create_customer_with_auth para resolver conflito de overloading
DROP FUNCTION IF EXISTS public.create_customer_with_auth(uuid, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_customer_with_auth(uuid, text, text, text, text, text, date, text, integer, text, text);

-- Criar função unificada create_customer_with_auth (versão simplificada para customer_auth)
CREATE FUNCTION public.create_customer_with_auth(
  p_tenant_id uuid,
  p_full_name text,
  p_email text,
  p_whatsapp text,
  p_password text,
  p_cpf_cnpj text DEFAULT NULL,
  p_birth_date text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_pix_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM customer_auth WHERE email = LOWER(p_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este e-mail já está cadastrado no sistema.');
  END IF;

  -- Verificar se WhatsApp já existe no mesmo tenant
  IF EXISTS (SELECT 1 FROM customers WHERE whatsapp = p_whatsapp AND tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este WhatsApp já está cadastrado.');
  END IF;

  -- Gerar hash da senha usando extensions schema
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Criar cliente
  INSERT INTO customers (
    tenant_id,
    full_name,
    email,
    whatsapp,
    cpf_cnpj,
    birth_date,
    notes,
    pix_key,
    status
  ) VALUES (
    p_tenant_id,
    p_full_name,
    LOWER(p_email),
    p_whatsapp,
    NULLIF(p_cpf_cnpj, ''),
    CASE WHEN p_birth_date IS NOT NULL AND p_birth_date != '' THEN p_birth_date::date ELSE NULL END,
    p_notes,
    p_pix_key,
    'active'
  )
  RETURNING id INTO v_customer_id;

  -- Criar autenticação
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
    p_password,
    true
  );

  -- Criar link de indicação
  INSERT INTO customer_referral_links (customer_id, tenant_id)
  VALUES (v_customer_id, p_tenant_id);

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Não foi possível criar o cliente. Tente novamente.');
END;
$function$;