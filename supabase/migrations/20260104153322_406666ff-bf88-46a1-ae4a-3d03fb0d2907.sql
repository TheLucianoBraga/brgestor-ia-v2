
-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Master users can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view tenant members" ON public.tenant_members;
DROP POLICY IF EXISTS "Tenant admins can add members" ON public.tenant_members;
DROP POLICY IF EXISTS "Tenant admins can update members" ON public.tenant_members;
DROP POLICY IF EXISTS "Tenant admins can remove members" ON public.tenant_members;

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- current_user_id: returns auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
$$;

-- current_tenant_id: returns current_tenant_id from profiles
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_tenant_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
$$;

-- is_member: checks if user is active member of a tenant
CREATE OR REPLACE FUNCTION public.is_member(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND status = 'active'
  )
$$;

-- =====================
-- PROFILES RLS
-- =====================
-- User can only read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- User can only insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- User can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================
-- TENANT_MEMBERS RLS
-- =====================
-- Members can only see members of their current tenant
CREATE POLICY "Members can view current tenant members"
ON public.tenant_members
FOR SELECT
USING (tenant_id = public.current_tenant_id());

-- Owner/admin can insert members to their current tenant
CREATE POLICY "Admins can add members to current tenant"
ON public.tenant_members
FOR INSERT
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND public.is_tenant_admin(auth.uid(), tenant_id)
);

-- Owner/admin can update members of their current tenant
CREATE POLICY "Admins can update members of current tenant"
ON public.tenant_members
FOR UPDATE
USING (
  tenant_id = public.current_tenant_id()
  AND public.is_tenant_admin(auth.uid(), tenant_id)
)
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND public.is_tenant_admin(auth.uid(), tenant_id)
);

-- Owner/admin can remove members from their current tenant
CREATE POLICY "Admins can remove members from current tenant"
ON public.tenant_members
FOR DELETE
USING (
  tenant_id = public.current_tenant_id()
  AND public.is_tenant_admin(auth.uid(), tenant_id)
);

-- =====================
-- TENANTS RLS
-- =====================
-- Member can read only their current tenant
CREATE POLICY "Members can read current tenant"
ON public.tenants
FOR SELECT
USING (id = public.current_tenant_id());

-- Members can view direct children (minimal metadata) of their current tenant
CREATE POLICY "Members can view direct children tenants"
ON public.tenants
FOR SELECT
USING (parent_tenant_id = public.current_tenant_id());

-- Master users and tenant admins can create child tenants
CREATE POLICY "Admins can create child tenants"
ON public.tenants
FOR INSERT
WITH CHECK (
  (public.is_master_user(auth.uid()) AND parent_tenant_id IS NULL)
  OR (parent_tenant_id = public.current_tenant_id() AND public.is_tenant_admin(auth.uid(), public.current_tenant_id()))
);

-- Tenant admins can update their current tenant
CREATE POLICY "Admins can update current tenant"
ON public.tenants
FOR UPDATE
USING (
  id = public.current_tenant_id()
  AND public.is_tenant_admin(auth.uid(), id)
)
WITH CHECK (
  id = public.current_tenant_id()
  AND public.is_tenant_admin(auth.uid(), id)
);

-- =====================
-- SECURE VIEW: tenant_children_minimal
-- =====================
CREATE OR REPLACE VIEW public.tenant_children_minimal
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  type,
  status,
  created_at
FROM public.tenants
WHERE parent_tenant_id = public.current_tenant_id();

-- =====================
-- RPC: set_current_tenant
-- =====================
CREATE OR REPLACE FUNCTION public.set_current_tenant(_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User must be authenticated');
  END IF;
  
  -- Check if user is active member of the tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User is not an active member of this tenant');
  END IF;
  
  -- Update current_tenant_id in profiles
  UPDATE public.profiles
  SET current_tenant_id = _tenant_id
  WHERE user_id = _user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Current tenant updated successfully',
    'tenant_id', _tenant_id
  );
END;
$$;
