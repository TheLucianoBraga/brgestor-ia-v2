-- Add plain_password column to customer_auth for sending to customers
ALTER TABLE public.customer_auth 
ADD COLUMN IF NOT EXISTS plain_password text;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.customer_auth.plain_password IS 'Stores plain password temporarily for sending to customer via message';