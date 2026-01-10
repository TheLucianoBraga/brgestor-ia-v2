-- Add new fields to plans table for Revenda and Admin plan types
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS price_monthly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_annual NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_fee_monthly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_fee_annual NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_clients INTEGER,
ADD COLUMN IF NOT EXISTS benefits TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.plans.description IS 'Plan description';
COMMENT ON COLUMN public.plans.price_monthly IS 'Monthly price charged';
COMMENT ON COLUMN public.plans.price_annual IS 'Annual price charged';
COMMENT ON COLUMN public.plans.min_fee_monthly IS 'Minimum monthly fee';
COMMENT ON COLUMN public.plans.min_fee_annual IS 'Minimum annual fee';
COMMENT ON COLUMN public.plans.duration_months IS 'Plan duration in months';
COMMENT ON COLUMN public.plans.sort_order IS 'Display order for plans';
COMMENT ON COLUMN public.plans.max_clients IS 'Maximum number of clients (for Revenda plans)';
COMMENT ON COLUMN public.plans.benefits IS 'Plan benefits in text format';