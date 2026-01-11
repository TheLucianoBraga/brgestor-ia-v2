
-- Update authenticate_customer to use plain_password for comparison
CREATE OR REPLACE FUNCTION public.authenticate_customer(_email text, _password_hash text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _auth RECORD;
BEGIN
  SELECT ca.*, c.full_name, c.tenant_id, c.status as customer_status
  INTO _auth
  FROM public.customer_auth ca
  JOIN public.customers c ON c.id = ca.customer_id
  WHERE ca.email = _email 
    AND (ca.password_hash = _password_hash OR ca.plain_password = _password_hash)
    AND ca.is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email ou senha inválidos');
  END IF;

  IF _auth.customer_status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Conta inativa');
  END IF;

  -- Update last login
  UPDATE public.customer_auth SET last_login = now() WHERE id = _auth.id;

  RETURN json_build_object(
    'success', true,
    'customer_id', _auth.customer_id,
    'customer_name', _auth.full_name,
    'tenant_id', _auth.tenant_id,
    'email', _auth.email
  );
END;
$$;
