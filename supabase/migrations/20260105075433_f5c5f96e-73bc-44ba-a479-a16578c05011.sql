-- Atualizar constraint para aceitar status 'pending' e 'trial'
ALTER TABLE tenants DROP CONSTRAINT tenants_status_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_status_check CHECK (status IN ('active', 'suspended', 'canceled', 'pending', 'trial'));