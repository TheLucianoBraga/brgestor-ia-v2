-- Create tenant_settings table for global configuration
CREATE TABLE public.tenant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- Enable RLS
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage tenant settings"
ON public.tenant_settings
FOR ALL
USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), tenant_id))
WITH CHECK (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_tenant_settings_updated_at
BEFORE UPDATE ON public.tenant_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();