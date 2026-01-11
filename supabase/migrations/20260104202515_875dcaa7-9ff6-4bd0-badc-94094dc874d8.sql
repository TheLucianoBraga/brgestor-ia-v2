
-- Create chatbot_sessions table for tracking customer interactions
CREATE TABLE public.chatbot_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chatbot_config table for tenant-specific settings
CREATE TABLE public.chatbot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  welcome_message TEXT NOT NULL DEFAULT 'Olá! 👋 Como posso ajudar você hoje?',
  menu_options JSONB NOT NULL DEFAULT '[
    {"id": "services", "label": "📋 Ver meus serviços", "action": "list_services"},
    {"id": "payment", "label": "💳 2ª via de boleto", "action": "generate_payment"},
    {"id": "hours", "label": "🕐 Horário de funcionamento", "action": "show_hours"},
    {"id": "attendant", "label": "👤 Falar com atendente", "action": "open_whatsapp"}
  ]'::jsonb,
  business_hours TEXT DEFAULT 'Segunda a Sexta: 08:00 às 18:00\nSábado: 08:00 às 12:00',
  auto_responses JSONB DEFAULT '{}'::jsonb,
  whatsapp_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_sessions
CREATE POLICY "Users can view chatbot_sessions from their tenant"
ON public.chatbot_sessions FOR SELECT
USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create chatbot_sessions in their tenant"
ON public.chatbot_sessions FOR INSERT
WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update chatbot_sessions in their tenant"
ON public.chatbot_sessions FOR UPDATE
USING (tenant_id = current_tenant_id());

-- RLS policies for chatbot_config
CREATE POLICY "Users can view chatbot_config from their tenant"
ON public.chatbot_config FOR SELECT
USING (tenant_id = current_tenant_id());

CREATE POLICY "Admins can manage chatbot_config"
ON public.chatbot_config FOR ALL
USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()))
WITH CHECK (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

-- Trigger for updated_at
CREATE TRIGGER update_chatbot_config_updated_at
BEFORE UPDATE ON public.chatbot_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
