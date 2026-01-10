-- Fix dangerous RLS policies on customer_referrals and add missing policies for customer_referral_links

-- ============================================
-- PART 1: Fix customer_referrals policies
-- ============================================

-- Drop the dangerous open policies
DROP POLICY IF EXISTS "Users can create referrals" ON public.customer_referrals;
DROP POLICY IF EXISTS "Tenant admins can manage referrals" ON public.customer_referrals;

-- Create proper INSERT policy - only tenant admins/masters/revendas can insert
CREATE POLICY "Tenant admins can insert referrals"
ON public.customer_referrals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_referrals.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role_in_tenant IN ('admin', 'master', 'revenda')
  )
);

-- Create proper UPDATE policy - only tenant admins/masters/revendas can update
CREATE POLICY "Tenant admins can update referrals"
ON public.customer_referrals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_referrals.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role_in_tenant IN ('admin', 'master', 'revenda')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_referrals.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role_in_tenant IN ('admin', 'master', 'revenda')
  )
);

-- Create DELETE policy - only tenant admins/masters can delete
CREATE POLICY "Tenant admins can delete referrals"
ON public.customer_referrals
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_referrals.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role_in_tenant IN ('admin', 'master')
  )
);

-- ============================================
-- PART 2: Add missing policies for customer_referral_links
-- ============================================

-- UPDATE policy - customer can update their own link OR tenant admin can update
CREATE POLICY "Customers can update own referral links"
ON public.customer_referral_links
FOR UPDATE
TO authenticated
USING (
  -- Customer owns this link (via their customer record)
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_referral_links.customer_id
      AND c.customer_tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = c.customer_tenant_id
          AND EXISTS (
            SELECT 1 FROM public.tenant_members tm2
            WHERE tm2.tenant_id = t.id AND tm2.user_id = auth.uid()
          )
      )
  )
  OR
  -- Tenant admin/master/revenda
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_referral_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role_in_tenant IN ('admin', 'master', 'revenda')
  )
)
WITH CHECK (
  -- Customer owns this link
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_referral_links.customer_id
      AND c.customer_tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = c.customer_tenant_id
          AND EXISTS (
            SELECT 1 FROM public.tenant_members tm2
            WHERE tm2.tenant_id = t.id AND tm2.user_id = auth.uid()
          )
      )
  )
  OR
  -- Tenant admin/master/revenda
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_referral_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role_in_tenant IN ('admin', 'master', 'revenda')
  )
);

-- DELETE policy - only tenant admins/masters can delete
CREATE POLICY "Tenant admins can delete referral links"
ON public.customer_referral_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_referral_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role_in_tenant IN ('admin', 'master')
  )
);