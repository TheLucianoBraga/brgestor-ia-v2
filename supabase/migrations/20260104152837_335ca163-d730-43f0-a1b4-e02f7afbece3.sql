-- ===========================================
-- MULTI-TENANT SCHEMA FOR BRGESTOR
-- ===========================================

-- 1) TENANTS TABLE
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('master', 'adm', 'revenda', 'cliente')),
  parent_tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  owner_tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'canceled')),
  created_at timestamptz DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.tenants IS 'Multi-tenant hierarchy table';
COMMENT ON COLUMN public.tenants.type IS 'master=platform owner, adm=admin, revenda=reseller, cliente=end client';
COMMENT ON COLUMN public.tenants.parent_tenant_id IS 'Hierarchical parent tenant';
COMMENT ON COLUMN public.tenants.owner_tenant_id IS 'For clients: the reseller/adm that owns this client';

-- Create index for performance
CREATE INDEX idx_tenants_parent ON public.tenants(parent_tenant_id);
CREATE INDEX idx_tenants_owner ON public.tenants(owner_tenant_id);
CREATE INDEX idx_tenants_type ON public.tenants(type);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2) TENANT_MEMBERS TABLE
CREATE TABLE public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_tenant text DEFAULT 'owner' CHECK (role_in_tenant IN ('owner', 'admin', 'finance', 'support', 'user')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

COMMENT ON TABLE public.tenant_members IS 'Links users to tenants with their role';
COMMENT ON COLUMN public.tenant_members.role_in_tenant IS 'owner=full control, admin=management, finance=billing, support=tickets, user=basic';

-- Create indexes
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);

-- Enable RLS
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 3) PROFILES TABLE
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  current_tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile with their currently selected tenant';

-- Create index
CREATE INDEX idx_profiles_current_tenant ON public.profiles(current_tenant_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- ===========================================

-- Check if user belongs to a tenant
CREATE OR REPLACE FUNCTION public.is_member_of_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND status = 'active'
  )
$$;

-- Check if user is owner/admin of a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role_in_tenant IN ('owner', 'admin')
      AND status = 'active'
  )
$$;

-- Check if user is MASTER tenant member
CREATE OR REPLACE FUNCTION public.is_master_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    JOIN public.tenants t ON tm.tenant_id = t.id
    WHERE tm.user_id = _user_id
      AND t.type = 'master'
      AND tm.status = 'active'
  )
$$;

-- Get user's tenant IDs
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.tenant_members
  WHERE user_id = _user_id
    AND status = 'active'
$$;

-- ===========================================
-- RLS POLICIES
-- ===========================================

-- TENANTS POLICIES
-- Users can see tenants they belong to
CREATE POLICY "Users can view their tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  public.is_member_of_tenant(auth.uid(), id)
  OR public.is_master_user(auth.uid())
);

-- Only master users can insert tenants
CREATE POLICY "Master users can create tenants"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (public.is_master_user(auth.uid()));

-- Tenant admins can update their tenant
CREATE POLICY "Tenant admins can update their tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (public.is_tenant_admin(auth.uid(), id))
WITH CHECK (public.is_tenant_admin(auth.uid(), id));

-- TENANT_MEMBERS POLICIES
-- Users can see members of tenants they belong to
CREATE POLICY "Users can view tenant members"
ON public.tenant_members
FOR SELECT
TO authenticated
USING (
  public.is_member_of_tenant(auth.uid(), tenant_id)
);

-- Tenant admins can manage members
CREATE POLICY "Tenant admins can add members"
ON public.tenant_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_tenant_admin(auth.uid(), tenant_id)
  OR public.is_master_user(auth.uid())
);

CREATE POLICY "Tenant admins can update members"
ON public.tenant_members
FOR UPDATE
TO authenticated
USING (public.is_tenant_admin(auth.uid(), tenant_id))
WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can remove members"
ON public.tenant_members
FOR DELETE
TO authenticated
USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- PROFILES POLICIES
-- Users can view any profile (for listing purposes)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- TRIGGER: Auto-create profile on user signup
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- SEED: Create MASTER tenant
-- ===========================================

INSERT INTO public.tenants (id, type, name, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'master',
  'BRGestor Master',
  'active'
);

-- ===========================================
-- RPC: Admin seed function to link master user
-- ===========================================

CREATE OR REPLACE FUNCTION public.admin_seed_link_master_user(
  _email text,
  _password text,
  _full_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _master_tenant_id uuid;
  _user_id uuid;
  _existing_owner_count int;
BEGIN
  -- Get master tenant
  SELECT id INTO _master_tenant_id
  FROM public.tenants
  WHERE type = 'master'
  LIMIT 1;

  IF _master_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Master tenant not found');
  END IF;

  -- Check if master already has an owner (security: only allow one setup)
  SELECT COUNT(*) INTO _existing_owner_count
  FROM public.tenant_members
  WHERE tenant_id = _master_tenant_id
    AND role_in_tenant = 'owner';

  IF _existing_owner_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Master tenant already has an owner. This function is for initial setup only.');
  END IF;

  -- Create user via Supabase Auth (this will trigger the profile creation)
  -- Note: In production, this would use supabase admin API
  -- For now, we'll just link an existing user if they sign up

  RETURN json_build_object(
    'success', true,
    'message', 'Please sign up with the provided email. After signup, call admin_complete_master_setup() to link as owner.',
    'master_tenant_id', _master_tenant_id
  );
END;
$$;

-- Function to complete master setup after user signs up
CREATE OR REPLACE FUNCTION public.admin_complete_master_setup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _master_tenant_id uuid;
  _user_id uuid;
  _existing_owner_count int;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User must be authenticated');
  END IF;

  -- Get master tenant
  SELECT id INTO _master_tenant_id
  FROM public.tenants
  WHERE type = 'master'
  LIMIT 1;

  IF _master_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Master tenant not found');
  END IF;

  -- Check if master already has an owner
  SELECT COUNT(*) INTO _existing_owner_count
  FROM public.tenant_members
  WHERE tenant_id = _master_tenant_id
    AND role_in_tenant = 'owner';

  IF _existing_owner_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Master tenant already has an owner');
  END IF;

  -- Link current user as master owner
  INSERT INTO public.tenant_members (tenant_id, user_id, role_in_tenant, status)
  VALUES (_master_tenant_id, _user_id, 'owner', 'active');

  -- Set current tenant
  UPDATE public.profiles
  SET current_tenant_id = _master_tenant_id
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User linked as Master owner successfully',
    'tenant_id', _master_tenant_id,
    'user_id', _user_id
  );
END;
$$;