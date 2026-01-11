-- Remover a versão com p_birth_date como DATE (a problemática)
DROP FUNCTION IF EXISTS public.create_customer_with_auth(uuid, text, text, text, text, text, date, text, integer, text);