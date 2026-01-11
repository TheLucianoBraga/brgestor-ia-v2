-- Create customer_charges table for charges linked to customers
CREATE TABLE public.customer_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_charges ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view customer charges for their tenant"
ON public.customer_charges
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create customer charges for their tenant"
ON public.customer_charges
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update customer charges for their tenant"
ON public.customer_charges
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete customer charges for their tenant"
ON public.customer_charges
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_customer_charges_updated_at
BEFORE UPDATE ON public.customer_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();