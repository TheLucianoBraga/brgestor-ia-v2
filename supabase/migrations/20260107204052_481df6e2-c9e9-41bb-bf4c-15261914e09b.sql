-- Fix status inconsistency: standardize to 'active' instead of 'ativo'

-- Update customer_items
UPDATE public.customer_items 
SET status = 'active' 
WHERE status IN ('ativo', 'ATIVO', 'Ativo');

-- Update customer_plan_subscriptions
UPDATE public.customer_plan_subscriptions 
SET status = 'active' 
WHERE status IN ('ativo', 'ATIVO', 'Ativo');

-- Update customers if needed
UPDATE public.customers 
SET status = 'active' 
WHERE status IN ('ativo', 'ATIVO', 'Ativo');