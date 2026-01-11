-- Create knowledge base table for FAQ and documents
CREATE TABLE public.chatbot_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'faq' CHECK (type IN ('faq', 'document', 'snippet')),
  category TEXT,
  question TEXT,
  answer TEXT,
  content TEXT,
  file_name TEXT,
  file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chatbot feedback table for ratings
CREATE TABLE public.chatbot_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chatbot_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rating BOOLEAN NOT NULL,
  message_id TEXT,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chatbot actions log for analytics
CREATE TABLE public.chatbot_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chatbot_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_data JSONB,
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add customer_id column to chatbot_sessions if it doesn't have proper reference
-- Also add rating and resolution columns
ALTER TABLE public.chatbot_sessions 
  ADD COLUMN IF NOT EXISTS rating BOOLEAN,
  ADD COLUMN IF NOT EXISTS resolved_by_ai BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS transferred_to_human BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_actions INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge base
CREATE POLICY "Tenant members can view knowledge base"
  ON public.chatbot_knowledge_base
  FOR SELECT
  USING (is_member(tenant_id));

CREATE POLICY "Tenant members can manage knowledge base"
  ON public.chatbot_knowledge_base
  FOR ALL
  USING (is_member(tenant_id));

-- RLS Policies for feedback
CREATE POLICY "Tenant members can view feedback"
  ON public.chatbot_feedback
  FOR SELECT
  USING (is_member(tenant_id));

CREATE POLICY "Anyone can create feedback"
  ON public.chatbot_feedback
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for actions
CREATE POLICY "Tenant members can view actions"
  ON public.chatbot_actions
  FOR SELECT
  USING (is_member(tenant_id));

CREATE POLICY "Anyone can log actions"
  ON public.chatbot_actions
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_base_tenant ON public.chatbot_knowledge_base(tenant_id);
CREATE INDEX idx_knowledge_base_type ON public.chatbot_knowledge_base(type, is_active);
CREATE INDEX idx_feedback_session ON public.chatbot_feedback(session_id);
CREATE INDEX idx_feedback_tenant ON public.chatbot_feedback(tenant_id);
CREATE INDEX idx_actions_session ON public.chatbot_actions(session_id);
CREATE INDEX idx_actions_tenant ON public.chatbot_actions(tenant_id);
CREATE INDEX idx_actions_type ON public.chatbot_actions(action_type);

-- Trigger to update updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.chatbot_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();