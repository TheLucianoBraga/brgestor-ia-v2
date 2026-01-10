-- Tabela de autenticação de clientes (separada de auth.users)
CREATE TABLE public.customer_auth (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  reset_token TEXT,
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.customer_auth ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas o tenant dono do customer pode gerenciar
CREATE POLICY "Tenant can manage customer auth"
ON public.customer_auth
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_auth.customer_id
    AND c.tenant_id = current_tenant_id()
  )
);

-- Política para login público (sem autenticação de usuário admin)
CREATE POLICY "Allow public login verification"
ON public.customer_auth
FOR SELECT
USING (true);

-- Função para autenticar cliente
CREATE OR REPLACE FUNCTION public.authenticate_customer(_email TEXT, _password_hash TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _auth RECORD;
  _customer RECORD;
BEGIN
  SELECT ca.*, c.full_name, c.tenant_id, c.status as customer_status
  INTO _auth
  FROM public.customer_auth ca
  JOIN public.customers c ON c.id = ca.customer_id
  WHERE ca.email = _email AND ca.password_hash = _password_hash AND ca.is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email ou senha inválidos');
  END IF;

  IF _auth.customer_status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Conta inativa');
  END IF;

  -- Update last login
  UPDATE public.customer_auth SET last_login = now() WHERE id = _auth.id;

  RETURN json_build_object(
    'success', true,
    'customer_id', _auth.customer_id,
    'customer_name', _auth.full_name,
    'tenant_id', _auth.tenant_id,
    'email', _auth.email
  );
END;
$$;

-- Função para verificar se cliente tem serviço ativo
CREATE OR REPLACE FUNCTION public.customer_has_active_service(_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_items
    WHERE customer_id = _customer_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;