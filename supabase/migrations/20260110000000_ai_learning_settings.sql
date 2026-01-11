-- Add AI Learning and Executive Mode settings
-- This migration adds configuration options for AI learning and executive mode

-- Insert default settings for AI learning features
INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT 
  t.id,
  'ai_executive_mode',
  'true'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_settings ts 
  WHERE ts.tenant_id = t.id AND ts.key = 'ai_executive_mode'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT 
  t.id,
  'ai_proactive_suggestions',
  'true'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_settings ts 
  WHERE ts.tenant_id = t.id AND ts.key = 'ai_proactive_suggestions'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT 
  t.id,
  'ai_background_analysis',
  'true'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_settings ts 
  WHERE ts.tenant_id = t.id AND ts.key = 'ai_background_analysis'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_settings (tenant_id, key, value)
SELECT 
  t.id,
  'ai_learning_enabled',
  'true'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_settings ts 
  WHERE ts.tenant_id = t.id AND ts.key = 'ai_learning_enabled'
)
ON CONFLICT DO NOTHING;

-- Add comment describing the new settings
COMMENT ON TABLE public.expense_ai_learning IS 'Tabela de aprendizado de IA - armazena padrões aprendidos sobre comportamento do usuário, categorização automática, detecção de anomalias e preferências';
