-- Fix remaining dangerous RLS policies with "true"

-- ============================================
-- 1. chatbot_actions - restrict to authenticated users with tenant access
-- ============================================
DROP POLICY IF EXISTS "Anyone can log actions" ON public.chatbot_actions;

CREATE POLICY "Authenticated users can log actions for their tenant"
ON public.chatbot_actions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = chatbot_actions.tenant_id
      AND tm.user_id = auth.uid()
  )
  OR
  -- Allow customers via their customer_tenant_id
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = chatbot_actions.customer_id
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
);

-- ============================================
-- 2. chatbot_feedback - restrict to authenticated users with tenant access
-- ============================================
DROP POLICY IF EXISTS "Anyone can create feedback" ON public.chatbot_feedback;

CREATE POLICY "Authenticated users can create feedback for their tenant"
ON public.chatbot_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = chatbot_feedback.tenant_id
      AND tm.user_id = auth.uid()
  )
);

-- ============================================
-- 3. trial_notifications - restrict to tenant admins only
-- ============================================
DROP POLICY IF EXISTS "System can insert trial notifications" ON public.trial_notifications;

CREATE POLICY "Tenant admins can insert trial notifications"
ON public.trial_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = trial_notifications.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role_in_tenant IN ('admin', 'master')
  )
);