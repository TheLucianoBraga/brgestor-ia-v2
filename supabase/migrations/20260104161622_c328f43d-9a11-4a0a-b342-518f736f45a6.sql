-- Function to link new users without ref_code to Master tenant
CREATE OR REPLACE FUNCTION public.link_user_to_master()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _master_tenant_id UUID;
  _already_member BOOLEAN;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User must be authenticated');
  END IF;

  -- Check if user is already member of any tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id AND status = 'active'
  ) INTO _already_member;

  IF _already_member THEN
    RETURN json_build_object('success', false, 'error', 'User is already member of a tenant');
  END IF;

  -- Get master tenant
  SELECT id INTO _master_tenant_id
  FROM public.tenants
  WHERE type = 'master'
  LIMIT 1;

  IF _master_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Master tenant not found');
  END IF;

  -- Link user to master tenant as 'user' role
  INSERT INTO public.tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (_master_tenant_id, _user_id, 'user', 'active')
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  -- Set current tenant
  UPDATE public.profiles
  SET current_tenant_id = _master_tenant_id
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User linked to Master tenant',
    'tenant_id', _master_tenant_id
  );
END;
$$;