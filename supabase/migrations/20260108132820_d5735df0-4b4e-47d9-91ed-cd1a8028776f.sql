-- Criar tabela de preferências de notificação
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_notifications BOOLEAN NOT NULL DEFAULT true,
  customer_notifications BOOLEAN NOT NULL DEFAULT true,
  reseller_notifications BOOLEAN NOT NULL DEFAULT true,
  charge_notifications BOOLEAN NOT NULL DEFAULT true,
  system_notifications BOOLEAN NOT NULL DEFAULT true,
  daily_summary_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_summary_time TIME NOT NULL DEFAULT '08:00:00',
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME NOT NULL DEFAULT '22:00:00',
  quiet_hours_end TIME NOT NULL DEFAULT '07:00:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Política para leitura - tenant members podem ver
CREATE POLICY "Tenant members can view notification preferences"
ON public.notification_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = notification_preferences.tenant_id
    AND tm.user_id = auth.uid()
  )
);

-- Política para inserção
CREATE POLICY "Tenant members can insert notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = notification_preferences.tenant_id
    AND tm.user_id = auth.uid()
  )
);

-- Política para atualização
CREATE POLICY "Tenant members can update notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = notification_preferences.tenant_id
    AND tm.user_id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();