-- Add parent_service_id to create service groups/variations
ALTER TABLE public.services 
ADD COLUMN parent_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- Add is_variation flag to easily identify child services
ALTER TABLE public.services 
ADD COLUMN is_variation BOOLEAN DEFAULT false;

-- Add variation_label to show what distinguishes this variation (e.g., "Mensal", "Anual")
ALTER TABLE public.services 
ADD COLUMN variation_label TEXT;

-- Create index for faster parent lookups
CREATE INDEX idx_services_parent_id ON public.services(parent_service_id) WHERE parent_service_id IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.services.parent_service_id IS 'Reference to parent service when this is a variation';
COMMENT ON COLUMN public.services.is_variation IS 'True if this service is a variation of another service';
COMMENT ON COLUMN public.services.variation_label IS 'Label for the variation (e.g., Mensal, Anual, Básico, Premium)';