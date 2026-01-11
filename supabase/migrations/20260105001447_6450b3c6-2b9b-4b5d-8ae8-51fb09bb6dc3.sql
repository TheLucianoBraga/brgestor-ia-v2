-- Add channel column to message_templates for email/whatsapp/in-app
ALTER TABLE public.message_templates 
ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp' 
CHECK (channel IN ('whatsapp', 'email', 'in_app'));

-- Create index for faster channel filtering
CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON public.message_templates(channel);

-- Create table for trial notifications tracking
CREATE TABLE IF NOT EXISTS public.trial_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('3_days', '1_day', 'expired')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'in_app')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, notification_type, channel)
);

-- Enable RLS
ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for trial_notifications
CREATE POLICY "Users can view their tenant trial notifications"
ON public.trial_notifications FOR SELECT
USING (is_member(tenant_id));

CREATE POLICY "System can insert trial notifications"
ON public.trial_notifications FOR INSERT
WITH CHECK (true);

-- Add index
CREATE INDEX IF NOT EXISTS idx_trial_notifications_tenant ON public.trial_notifications(tenant_id);