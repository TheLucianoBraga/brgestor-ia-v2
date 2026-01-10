-- Create charge_schedules table
CREATE TABLE public.charge_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_item_id UUID REFERENCES public.customer_items(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL, -- 'before_due', 'after_due'
  days_offset INTEGER NOT NULL, -- -3, -1, 1, 3, 7
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.charge_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view charge_schedules from their tenant"
ON public.charge_schedules FOR SELECT
USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create charge_schedules in their tenant"
ON public.charge_schedules FOR INSERT
WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update charge_schedules in their tenant"
ON public.charge_schedules FOR UPDATE
USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete charge_schedules in their tenant"
ON public.charge_schedules FOR DELETE
USING (tenant_id = current_tenant_id());

-- Index for cron job efficiency
CREATE INDEX idx_charge_schedules_pending ON public.charge_schedules(scheduled_for, status) WHERE status = 'pending';
CREATE INDEX idx_charge_schedules_customer ON public.charge_schedules(customer_id);
CREATE INDEX idx_charge_schedules_tenant ON public.charge_schedules(tenant_id);