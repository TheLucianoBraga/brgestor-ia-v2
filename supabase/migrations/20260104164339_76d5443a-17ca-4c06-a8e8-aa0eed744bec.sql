-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create clients table (people who receive billing, not tenants)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create charges table (billing sent to clients)
CREATE TABLE public.charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Users can view clients from their tenant"
ON public.clients FOR SELECT
USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create clients in their tenant"
ON public.clients FOR INSERT
WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update clients in their tenant"
ON public.clients FOR UPDATE
USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete clients in their tenant"
ON public.clients FOR DELETE
USING (tenant_id = current_tenant_id());

-- RLS policies for charges
CREATE POLICY "Users can view charges from their tenant"
ON public.charges FOR SELECT
USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create charges in their tenant"
ON public.charges FOR INSERT
WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update charges in their tenant"
ON public.charges FOR UPDATE
USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete charges in their tenant"
ON public.charges FOR DELETE
USING (tenant_id = current_tenant_id());

-- Create trigger for updated_at on clients
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on charges
CREATE TRIGGER update_charges_updated_at
BEFORE UPDATE ON public.charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();