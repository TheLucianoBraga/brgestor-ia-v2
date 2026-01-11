-- Add new columns to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS long_description text,
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS commission_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS recurrence_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_months integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS cta_text text DEFAULT 'Assinar',
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Add comment to explain the fields
COMMENT ON COLUMN public.services.short_description IS 'Uma linha descrevendo o serviço';
COMMENT ON COLUMN public.services.long_description IS 'Descrição detalhada do serviço';
COMMENT ON COLUMN public.services.images IS 'Array de URLs de imagens do serviço';
COMMENT ON COLUMN public.services.benefits IS 'Lista de benefícios do serviço';
COMMENT ON COLUMN public.services.commission_type IS 'Tipo de comissão: percentage ou fixed';
COMMENT ON COLUMN public.services.commission_value IS 'Valor da comissão inicial para afiliados';
COMMENT ON COLUMN public.services.recurrence_enabled IS 'Se há recorrência de comissão (revshare)';
COMMENT ON COLUMN public.services.recurrence_value IS 'Valor da recorrência em porcentagem';
COMMENT ON COLUMN public.services.duration_months IS 'Duração do serviço em meses (0 = vitalício)';
COMMENT ON COLUMN public.services.cta_text IS 'Texto do botão de ação';
COMMENT ON COLUMN public.services.display_order IS 'Ordem de exibição do serviço';
COMMENT ON COLUMN public.services.is_featured IS 'Se o serviço é destaque';