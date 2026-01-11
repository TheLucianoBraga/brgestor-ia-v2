-- Tabela de grupos WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  waha_group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  participant_count INT DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, waha_group_id)
);

-- Tabela de configuração do auto-responder por grupo
CREATE TABLE IF NOT EXISTS group_autoresponder_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES whatsapp_groups(id) ON DELETE CASCADE UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config_type TEXT DEFAULT 'inherit',
  respond_on_mention BOOLEAN DEFAULT true,
  respond_on_keywords BOOLEAN DEFAULT true,
  respond_on_questions BOOLEAN DEFAULT true,
  respond_all BOOLEAN DEFAULT false,
  mode TEXT DEFAULT 'complete',
  tone TEXT DEFAULT 'friendly',
  custom_context TEXT,
  max_responses_per_minute INT DEFAULT 5,
  response_delay_seconds INT DEFAULT 2,
  ignore_admins BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_autoresponder_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para whatsapp_groups
CREATE POLICY "Users can view groups from their tenant" ON whatsapp_groups
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create groups in their tenant" ON whatsapp_groups
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update groups in their tenant" ON whatsapp_groups
  FOR UPDATE USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete groups in their tenant" ON whatsapp_groups
  FOR DELETE USING (tenant_id = current_tenant_id());

-- Políticas RLS para group_autoresponder_config
CREATE POLICY "Users can view group configs from their tenant" ON group_autoresponder_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM whatsapp_groups g 
      WHERE g.id = group_autoresponder_config.group_id 
      AND g.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "Users can create group configs in their tenant" ON group_autoresponder_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM whatsapp_groups g 
      WHERE g.id = group_autoresponder_config.group_id 
      AND g.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "Users can update group configs in their tenant" ON group_autoresponder_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM whatsapp_groups g 
      WHERE g.id = group_autoresponder_config.group_id 
      AND g.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "Users can delete group configs in their tenant" ON group_autoresponder_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM whatsapp_groups g 
      WHERE g.id = group_autoresponder_config.group_id 
      AND g.tenant_id = current_tenant_id()
    )
  );

-- Índices para performance
CREATE INDEX idx_whatsapp_groups_tenant ON whatsapp_groups(tenant_id);
CREATE INDEX idx_group_config_group ON group_autoresponder_config(group_id);