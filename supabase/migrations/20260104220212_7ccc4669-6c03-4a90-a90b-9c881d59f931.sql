-- Create scheduled_messages table for message scheduling
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  custom_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant members can view scheduled messages"
  ON public.scheduled_messages FOR SELECT
  USING (is_member(tenant_id));

CREATE POLICY "Tenant members can create scheduled messages"
  ON public.scheduled_messages FOR INSERT
  WITH CHECK (is_member(tenant_id));

CREATE POLICY "Tenant members can update scheduled messages"
  ON public.scheduled_messages FOR UPDATE
  USING (is_member(tenant_id));

CREATE POLICY "Tenant members can delete scheduled messages"
  ON public.scheduled_messages FOR DELETE
  USING (is_member(tenant_id));

-- Create index for efficient querying
CREATE INDEX idx_scheduled_messages_pending ON public.scheduled_messages(scheduled_at) 
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_messages_tenant ON public.scheduled_messages(tenant_id);