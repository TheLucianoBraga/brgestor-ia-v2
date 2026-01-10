-- Add pix_key column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pix_key TEXT;