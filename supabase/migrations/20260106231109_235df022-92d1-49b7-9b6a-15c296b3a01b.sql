-- Recreate the function to use extensions schema for pgcrypto functions
CREATE OR REPLACE FUNCTION public.create_customer_auth_only(
  p_customer_id UUID,
  p_email TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_password_hash TEXT;
  v_existing_auth UUID;
BEGIN
  -- Check if auth already exists
  SELECT id INTO v_existing_auth
  FROM customer_auth
  WHERE customer_id = p_customer_id;
  
  IF v_existing_auth IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cliente já possui acesso ao portal');
  END IF;
  
  -- Hash password using pgcrypto from extensions schema
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  
  -- Create auth record
  INSERT INTO customer_auth (customer_id, email, password_hash, is_active)
  VALUES (p_customer_id, p_email, v_password_hash, true);
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'Email já cadastrado');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;