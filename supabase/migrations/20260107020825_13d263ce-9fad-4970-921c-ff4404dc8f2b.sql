
-- Atualizar validate_ref_code para suportar links de indicação de clientes
CREATE OR REPLACE FUNCTION public.validate_ref_code(_code bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ref_code RECORD;
  _customer_link RECORD;
BEGIN
  -- Primeiro, verificar se é um código de revenda/tenant (ref_codes)
  SELECT code, kind, owner_tenant_id, payload, active
  INTO _ref_code
  FROM public.ref_codes
  WHERE code = _code AND active = true;

  IF FOUND THEN
    RETURN json_build_object(
      'valid', true,
      'code', _ref_code.code,
      'kind', _ref_code.kind,
      'owner_tenant_id', _ref_code.owner_tenant_id,
      'payload', _ref_code.payload,
      'is_customer_referral', false
    );
  END IF;

  -- Se não encontrou em ref_codes, verificar em customer_referral_links
  SELECT crl.ref_code, crl.customer_id, crl.tenant_id, c.full_name
  INTO _customer_link
  FROM public.customer_referral_links crl
  JOIN public.customers c ON c.id = crl.customer_id
  WHERE crl.ref_code = _code AND crl.is_active = true;

  IF FOUND THEN
    RETURN json_build_object(
      'valid', true,
      'code', _customer_link.ref_code,
      'kind', 'customer_referral',
      'owner_tenant_id', _customer_link.tenant_id,
      'payload', json_build_object(
        'referrer_customer_id', _customer_link.customer_id,
        'referrer_name', _customer_link.full_name
      ),
      'is_customer_referral', true
    );
  END IF;

  -- Código não encontrado em nenhuma tabela
  RETURN json_build_object('valid', false, 'error', 'Código inválido ou expirado');
END;
$function$;
