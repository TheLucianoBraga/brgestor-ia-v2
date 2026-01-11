
-- ============================================
-- CORREÇÃO COMPLETA: RLS para área /cliente
-- ============================================
-- O problema: current_tenant_id() busca de profiles, mas clientes 
-- logados como tipo 'cliente' precisam acessar dados via customer_tenant_id

-- 1. Função auxiliar para verificar se usuário pode acessar dados do cliente
CREATE OR REPLACE FUNCTION public.user_can_access_customer_data(customer_tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- É membro do tenant diretamente
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = customer_tenant_uuid
      AND tm.user_id = auth.uid()
    )
    OR
    -- current_tenant_id corresponde (admin vendo cliente)
    current_tenant_id() = (
      SELECT c.tenant_id FROM customers c 
      WHERE c.customer_tenant_id = customer_tenant_uuid
      LIMIT 1
    )
$$;

-- 2. Função para verificar se usuário pode acessar customer_items
CREATE OR REPLACE FUNCTION public.can_view_customer_items(item_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = item_customer_id
    AND (
      -- Admin do tenant do cliente
      c.tenant_id = current_tenant_id()
      OR
      -- Cliente acessando seus próprios items
      EXISTS (
        SELECT 1 FROM tenant_members tm
        WHERE tm.tenant_id = c.customer_tenant_id
        AND tm.user_id = auth.uid()
      )
    )
  )
$$;

-- 3. Atualizar política de customer_items para SELECT
DROP POLICY IF EXISTS "Users can view customer_items from their tenant" ON public.customer_items;
CREATE POLICY "Users can view customer_items from their tenant"
ON public.customer_items
FOR SELECT
USING (can_view_customer_items(customer_id));

-- 4. Função para verificar se pode ver customers
CREATE OR REPLACE FUNCTION public.can_view_customer(cust_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = cust_id
    AND (
      -- Admin do tenant
      c.tenant_id = current_tenant_id()
      OR
      -- Cliente vendo a si mesmo
      EXISTS (
        SELECT 1 FROM tenant_members tm
        WHERE tm.tenant_id = c.customer_tenant_id
        AND tm.user_id = auth.uid()
      )
    )
  )
$$;

-- 5. Atualizar política de customers para SELECT
DROP POLICY IF EXISTS "Users can view customers from their tenant" ON public.customers;
CREATE POLICY "Users can view customers from their tenant"
ON public.customers
FOR SELECT
USING (can_view_customer(id));

-- 6. Função para verificar acesso a referral_links
CREATE OR REPLACE FUNCTION public.can_view_referral_link(link_customer_id uuid, link_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admin do tenant
    link_tenant_id = current_tenant_id()
    OR
    -- Cliente que é dono do link
    EXISTS (
      SELECT 1 FROM customers c
      JOIN tenant_members tm ON tm.tenant_id = c.customer_tenant_id
      WHERE c.id = link_customer_id
      AND tm.user_id = auth.uid()
    )
$$;

-- 7. Atualizar política de customer_referral_links
DROP POLICY IF EXISTS "Customers can view their own referral links" ON public.customer_referral_links;
CREATE POLICY "Customers can view their own referral links"
ON public.customer_referral_links
FOR SELECT
USING (
  can_view_referral_link(customer_id, tenant_id)
  OR is_active = true -- Links ativos podem ser vistos publicamente (para /r/CODE)
);
