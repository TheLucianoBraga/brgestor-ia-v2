-- Limpar dados incorretos do cliente teste
-- 1. Deletar subscription
DELETE FROM subscriptions WHERE buyer_tenant_id = 'c929b10d-2df8-437b-acb5-f4de59a02e4b';

-- 2. Deletar customer_items
DELETE FROM customer_items WHERE customer_id = '1b1b2e62-45b0-4de4-8743-0df8d4cc3735';

-- 3. Atualizar customer para pending
UPDATE customers SET status = 'pending' WHERE id = '1b1b2e62-45b0-4de4-8743-0df8d4cc3735';

-- 4. Atualizar tenant para pending
UPDATE tenants SET status = 'pending' WHERE id = 'c929b10d-2df8-437b-acb5-f4de59a02e4b';

-- 5. Atualizar tenant_member para disabled (bloquear acesso até aprovação)
UPDATE tenant_members SET status = 'disabled' WHERE tenant_id = 'c929b10d-2df8-437b-acb5-f4de59a02e4b';

-- 6. Atualizar a constraint do tenant_members para permitir 'pending' no futuro
ALTER TABLE tenant_members DROP CONSTRAINT tenant_members_status_check;
ALTER TABLE tenant_members ADD CONSTRAINT tenant_members_status_check 
  CHECK (status = ANY (ARRAY['active', 'invited', 'disabled', 'pending']));