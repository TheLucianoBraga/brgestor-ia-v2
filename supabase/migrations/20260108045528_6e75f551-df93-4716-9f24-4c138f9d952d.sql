-- Drop and recreate the function with correct types (code is bigint in ref_codes table)
DROP FUNCTION IF EXISTS public.get_master_signup_ref_code();

CREATE OR REPLACE FUNCTION public.get_master_signup_ref_code()
RETURNS TABLE(ref_code bigint, kind text) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_id uuid;
BEGIN
  -- Find master tenant (no parent)
  SELECT id INTO v_master_id
  FROM tenants
  WHERE parent_tenant_id IS NULL
  LIMIT 1;
  
  IF v_master_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return ref codes for signup
  RETURN QUERY
  SELECT rc.code, rc.kind
  FROM ref_codes rc
  WHERE rc.owner_tenant_id = v_master_id
    AND rc.active = true
    AND rc.kind IN ('signup_revenda', 'signup_cliente');
END;
$$;

-- Grant execute to anonymous users
GRANT EXECUTE ON FUNCTION public.get_master_signup_ref_code() TO anon;
GRANT EXECUTE ON FUNCTION public.get_master_signup_ref_code() TO authenticated;