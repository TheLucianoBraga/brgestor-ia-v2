
-- =============================================
-- MÓDULO DE DESPESAS - SCHEMA COMPLETO
-- =============================================

-- 1. Categorias de Despesas (livres por tenant)
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'receipt',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Centros de Custo (para rateio)
CREATE TABLE public.expense_cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Despesas (tabela principal)
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  supplier TEXT,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  -- Recorrência
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB,
  parent_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'due_today', 'overdue', 'paid', 'scheduled', 'cancelled'))
);

-- 4. Anexos de Despesas
CREATE TABLE public.expense_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID
);

-- 5. Rateio por Centro de Custo
CREATE TABLE public.expense_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  cost_center_id UUID NOT NULL REFERENCES public.expense_cost_centers(id) ON DELETE CASCADE,
  percentage NUMERIC NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Histórico de Alterações (auditoria)
CREATE TABLE public.expense_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Lembretes de Despesas
CREATE TABLE public.expense_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  days_offset INTEGER NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  response_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_channel CHECK (channel IN ('whatsapp', 'email', 'in_app')),
  CONSTRAINT valid_reminder_status CHECK (status IN ('pending', 'sent', 'failed', 'responded'))
);

-- 8. Aprendizado da IA
CREATE TABLE public.expense_ai_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  pattern_value JSONB NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  occurrences INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_pattern_type CHECK (pattern_type IN ('category_mapping', 'payment_timing', 'preferred_channel', 'preferred_hours', 'supplier_mapping', 'anomaly_threshold'))
);

-- Unique constraint para padrões únicos por tenant
CREATE UNIQUE INDEX idx_expense_ai_learning_unique ON public.expense_ai_learning(tenant_id, pattern_type, pattern_key);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_due_date ON public.expenses(due_date);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);
CREATE INDEX idx_expense_categories_tenant ON public.expense_categories(tenant_id);
CREATE INDEX idx_expense_cost_centers_tenant ON public.expense_cost_centers(tenant_id);
CREATE INDEX idx_expense_attachments_expense ON public.expense_attachments(expense_id);
CREATE INDEX idx_expense_allocations_expense ON public.expense_allocations(expense_id);
CREATE INDEX idx_expense_history_expense ON public.expense_history(expense_id);
CREATE INDEX idx_expense_reminders_expense ON public.expense_reminders(expense_id);
CREATE INDEX idx_expense_reminders_scheduled ON public.expense_reminders(scheduled_for) WHERE status = 'pending';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_ai_learning ENABLE ROW LEVEL SECURITY;

-- expense_categories policies
CREATE POLICY "Users can view expense_categories from their tenant"
  ON public.expense_categories FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create expense_categories in their tenant"
  ON public.expense_categories FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update expense_categories in their tenant"
  ON public.expense_categories FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete expense_categories in their tenant"
  ON public.expense_categories FOR DELETE
  USING (tenant_id = current_tenant_id());

-- expense_cost_centers policies
CREATE POLICY "Users can view expense_cost_centers from their tenant"
  ON public.expense_cost_centers FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create expense_cost_centers in their tenant"
  ON public.expense_cost_centers FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update expense_cost_centers in their tenant"
  ON public.expense_cost_centers FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete expense_cost_centers in their tenant"
  ON public.expense_cost_centers FOR DELETE
  USING (tenant_id = current_tenant_id());

-- expenses policies
CREATE POLICY "Users can view expenses from their tenant"
  ON public.expenses FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create expenses in their tenant"
  ON public.expenses FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update expenses in their tenant"
  ON public.expenses FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete expenses in their tenant"
  ON public.expenses FOR DELETE
  USING (tenant_id = current_tenant_id());

-- expense_attachments policies
CREATE POLICY "Users can view expense_attachments from their tenant"
  ON public.expense_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_attachments.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Users can create expense_attachments in their tenant"
  ON public.expense_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_attachments.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Users can delete expense_attachments in their tenant"
  ON public.expense_attachments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_attachments.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

-- expense_allocations policies
CREATE POLICY "Users can view expense_allocations from their tenant"
  ON public.expense_allocations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_allocations.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Users can create expense_allocations in their tenant"
  ON public.expense_allocations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_allocations.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Users can update expense_allocations in their tenant"
  ON public.expense_allocations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_allocations.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Users can delete expense_allocations in their tenant"
  ON public.expense_allocations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_allocations.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

-- expense_history policies (append-only)
CREATE POLICY "Users can view expense_history from their tenant"
  ON public.expense_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_history.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Users can create expense_history in their tenant"
  ON public.expense_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_history.expense_id
    AND e.tenant_id = current_tenant_id()
  ));

-- expense_reminders policies
CREATE POLICY "Users can view expense_reminders from their tenant"
  ON public.expense_reminders FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create expense_reminders in their tenant"
  ON public.expense_reminders FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update expense_reminders in their tenant"
  ON public.expense_reminders FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete expense_reminders in their tenant"
  ON public.expense_reminders FOR DELETE
  USING (tenant_id = current_tenant_id());

-- expense_ai_learning policies
CREATE POLICY "Users can view expense_ai_learning from their tenant"
  ON public.expense_ai_learning FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create expense_ai_learning in their tenant"
  ON public.expense_ai_learning FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update expense_ai_learning in their tenant"
  ON public.expense_ai_learning FOR UPDATE
  USING (tenant_id = current_tenant_id());

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_expense_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_updated_at();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_updated_at();

CREATE TRIGGER update_expense_cost_centers_updated_at
  BEFORE UPDATE ON public.expense_cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_updated_at();

CREATE TRIGGER update_expense_ai_learning_updated_at
  BEFORE UPDATE ON public.expense_ai_learning
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_updated_at();

-- Trigger para registrar histórico automaticamente
CREATE OR REPLACE FUNCTION public.log_expense_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log mudanças de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.expense_history (expense_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status_change', 'status', OLD.status, NEW.status, auth.uid());
    END IF;
    
    -- Log mudanças de valor
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
      INSERT INTO public.expense_history (expense_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'amount_change', 'amount', OLD.amount::text, NEW.amount::text, auth.uid());
    END IF;
    
    -- Log pagamento
    IF OLD.paid_at IS NULL AND NEW.paid_at IS NOT NULL THEN
      INSERT INTO public.expense_history (expense_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'marked_paid', 'paid_at', NULL, NEW.paid_at::text, auth.uid());
    END IF;
    
    -- Log mudança de vencimento
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.expense_history (expense_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'due_date_change', 'due_date', OLD.due_date::text, NEW.due_date::text, auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_expense_changes
  AFTER UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_expense_changes();

-- Trigger para atualizar status automaticamente
CREATE OR REPLACE FUNCTION public.update_expense_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atualiza se não estiver pago ou cancelado
  IF NEW.status NOT IN ('paid', 'cancelled') THEN
    IF NEW.paid_at IS NOT NULL THEN
      NEW.status = 'paid';
    ELSIF NEW.due_date = CURRENT_DATE THEN
      NEW.status = 'due_today';
    ELSIF NEW.due_date < CURRENT_DATE THEN
      NEW.status = 'overdue';
    ELSIF NEW.is_recurring AND NEW.due_date > CURRENT_DATE THEN
      NEW.status = 'scheduled';
    ELSE
      NEW.status = 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expense_status
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_status();

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_reminders;
