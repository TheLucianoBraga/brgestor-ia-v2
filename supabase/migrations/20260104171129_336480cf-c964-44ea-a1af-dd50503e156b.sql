-- Add new fields to customers table
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS birth_date DATE NULL,
  ADD COLUMN IF NOT EXISTS rg_ie TEXT NULL,
  ADD COLUMN IF NOT EXISTS gender TEXT NULL,
  ADD COLUMN IF NOT EXISTS secondary_phone TEXT NULL,
  ADD COLUMN IF NOT EXISTS allow_whatsapp BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_portal_notifications BOOLEAN NOT NULL DEFAULT true;

-- Make email required (update existing nulls first if any)
UPDATE public.customers SET email = '' WHERE email IS NULL;
ALTER TABLE public.customers ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN email SET DEFAULT '';