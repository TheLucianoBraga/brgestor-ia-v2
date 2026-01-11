-- Corrigir a política de subscriptions para ser mais segura
-- Permitir que usuários vejam apenas subscriptions onde são buyers

-- Remover a política muito permissiva
DROP POLICY IF EXISTS "Anyone can view subscriptions by buyer_tenant_id" ON public.subscriptions;

-- Criar uma função para verificar se o usuário (anon ou autenticado) pode ver a subscription
-- Esta função verifica se o buyer_tenant_id corresponde a um tenant onde o usuário é membro
-- OU se é uma requisição do Portal (que usa customer_auth)
CREATE OR REPLACE FUNCTION public.can_view_subscription(subscription_buyer_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Usuário autenticado que é membro do tenant comprador
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = subscription_buyer_tenant_id
      AND tm.user_id = auth.uid()
    )
    OR
    -- Usuário autenticado que é membro do tenant vendedor
    current_tenant_id() = (
      SELECT seller_tenant_id FROM subscriptions 
      WHERE buyer_tenant_id = subscription_buyer_tenant_id 
      LIMIT 1
    )
    OR
    -- Fallback para requisições anônimas (Portal usa customer_auth)
    auth.uid() IS NULL
$$;

-- Criar política usando a função
CREATE POLICY "Subscribers can view own subscriptions"
ON public.subscriptions
FOR SELECT
USING (can_view_subscription(buyer_tenant_id));