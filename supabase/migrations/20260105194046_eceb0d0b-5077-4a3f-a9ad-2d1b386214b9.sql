-- Tabela de memória de conversas por contato
CREATE TABLE IF NOT EXISTS chat_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  contact_name TEXT,
  is_customer BOOLEAN DEFAULT false,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  is_owner BOOLEAN DEFAULT false,
  is_reseller BOOLEAN DEFAULT false,
  conversation_summary TEXT,
  interests TEXT[],
  last_intent TEXT,
  messages_count INT DEFAULT 0,
  first_contact_at TIMESTAMPTZ DEFAULT now(),
  last_contact_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(tenant_id, phone)
);

-- Tabela de histórico de mensagens
CREATE TABLE IF NOT EXISTS chat_messages_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES chat_memory(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  intent_detected TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_chat_memory_tenant_phone ON chat_memory(tenant_id, phone);
CREATE INDEX idx_chat_memory_customer ON chat_memory(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_chat_messages_memory ON chat_messages_history(memory_id);
CREATE INDEX idx_chat_messages_created ON chat_messages_history(memory_id, created_at DESC);

-- Habilitar RLS
ALTER TABLE chat_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_memory
CREATE POLICY "Users can view chat_memory from their tenant"
  ON chat_memory FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create chat_memory in their tenant"
  ON chat_memory FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update chat_memory in their tenant"
  ON chat_memory FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete chat_memory in their tenant"
  ON chat_memory FOR DELETE
  USING (tenant_id = current_tenant_id());

-- Políticas RLS para chat_messages_history (via memory_id)
CREATE POLICY "Users can view chat_messages_history from their tenant"
  ON chat_messages_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_memory cm 
    WHERE cm.id = chat_messages_history.memory_id 
    AND cm.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Users can create chat_messages_history in their tenant"
  ON chat_messages_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_memory cm 
    WHERE cm.id = chat_messages_history.memory_id 
    AND cm.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Users can delete chat_messages_history in their tenant"
  ON chat_messages_history FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM chat_memory cm 
    WHERE cm.id = chat_messages_history.memory_id 
    AND cm.tenant_id = current_tenant_id()
  ));