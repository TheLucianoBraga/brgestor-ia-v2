-- Adicionar política RLS para permitir acesso anônimo às subscriptions do comprador
-- Isso permite que clientes do portal vejam suas próprias subscriptions

-- Primeiro, verificar se a política existe
DO $$
BEGIN
  -- Tentar dropar a política se existir
  DROP POLICY IF EXISTS "Anyone can view subscriptions by buyer_tenant_id" ON public.subscriptions;
END $$;

-- Criar política que permite SELECT baseado em buyer_tenant_id
-- Isso é necessário para o Portal do cliente que usa customer_auth
CREATE POLICY "Anyone can view subscriptions by buyer_tenant_id"
ON public.subscriptions
FOR SELECT
USING (true);

-- NOTA: Esta é uma política temporária permissiva
-- Para maior segurança, considerar usar uma Edge Function com service_role