
-- 1. message_templates - Templates de mensagem WhatsApp
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cobranca', 'lembrete', 'boas_vindas', 'aviso', 'personalizado')),
  content text NOT NULL,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message_templates from their tenant"
  ON public.message_templates FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create message_templates in their tenant"
  ON public.message_templates FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update message_templates in their tenant"
  ON public.message_templates FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can delete message_templates in their tenant"
  ON public.message_templates FOR DELETE
  USING (tenant_id = current_tenant_id());

-- 2. message_logs - Histórico de mensagens enviadas
CREATE TABLE public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message_logs from their tenant"
  ON public.message_logs FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Users can create message_logs in their tenant"
  ON public.message_logs FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update message_logs in their tenant"
  ON public.message_logs FOR UPDATE
  USING (tenant_id = current_tenant_id());

-- 3. notifications - Notificações do sistema
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read boolean DEFAULT false,
  reference_id uuid,
  reference_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() AND tenant_id = current_tenant_id());

CREATE POLICY "System can create notifications for tenant users"
  ON public.notifications FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() AND tenant_id = current_tenant_id());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid() AND tenant_id = current_tenant_id());

-- 4. activity_logs - Auditoria
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity_logs from their tenant"
  ON public.activity_logs FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

CREATE POLICY "System can create activity_logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- 5. referral_links - Links de indicação
CREATE TABLE public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ref_code bigint NOT NULL REFERENCES public.ref_codes(code) ON DELETE CASCADE,
  commission_type text NOT NULL CHECK (commission_type IN ('percent', 'fixed')),
  commission_value numeric(12,2) NOT NULL DEFAULT 0,
  total_referrals integer DEFAULT 0,
  total_earned numeric(12,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referral_links from their tenant"
  ON public.referral_links FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Admins can create referral_links in their tenant"
  ON public.referral_links FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

CREATE POLICY "Admins can update referral_links in their tenant"
  ON public.referral_links FOR UPDATE
  USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

CREATE POLICY "Admins can delete referral_links in their tenant"
  ON public.referral_links FOR DELETE
  USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

-- 6. referral_history - Histórico de indicações
CREATE TABLE public.referral_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id uuid NOT NULL REFERENCES public.referral_links(id) ON DELETE CASCADE,
  referred_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referral_history for their links"
  ON public.referral_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.referral_links rl
    WHERE rl.id = referral_history.referral_link_id
    AND rl.tenant_id = current_tenant_id()
  ));

CREATE POLICY "System can create referral_history"
  ON public.referral_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.referral_links rl
    WHERE rl.id = referral_history.referral_link_id
    AND rl.tenant_id = current_tenant_id()
  ));

CREATE POLICY "Admins can update referral_history"
  ON public.referral_history FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.referral_links rl
    WHERE rl.id = referral_history.referral_link_id
    AND rl.tenant_id = current_tenant_id()
  ) AND is_tenant_admin(auth.uid(), current_tenant_id()));

-- 7. content_posts - Conteúdo/Comunicados
CREATE TABLE public.content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video')),
  media_url text,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view content_posts from their tenant"
  ON public.content_posts FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Admins can create content_posts in their tenant"
  ON public.content_posts FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

CREATE POLICY "Admins can update content_posts in their tenant"
  ON public.content_posts FOR UPDATE
  USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

CREATE POLICY "Admins can delete content_posts in their tenant"
  ON public.content_posts FOR DELETE
  USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

-- 8. whatsapp_instances - Conexões WhatsApp
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  phone_number text,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected', 'qrcode', 'connecting')),
  qr_code text,
  api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view whatsapp_instances from their tenant"
  ON public.whatsapp_instances FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Admins can create whatsapp_instances in their tenant"
  ON public.whatsapp_instances FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

CREATE POLICY "Admins can update whatsapp_instances in their tenant"
  ON public.whatsapp_instances FOR UPDATE
  USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

CREATE POLICY "Admins can delete whatsapp_instances in their tenant"
  ON public.whatsapp_instances FOR DELETE
  USING (tenant_id = current_tenant_id() AND is_tenant_admin(auth.uid(), current_tenant_id()));

-- Indexes para performance
CREATE INDEX idx_message_templates_tenant ON public.message_templates(tenant_id);
CREATE INDEX idx_message_logs_tenant ON public.message_logs(tenant_id);
CREATE INDEX idx_message_logs_customer ON public.message_logs(customer_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_activity_logs_tenant ON public.activity_logs(tenant_id, created_at DESC);
CREATE INDEX idx_referral_links_tenant ON public.referral_links(tenant_id);
CREATE INDEX idx_content_posts_tenant ON public.content_posts(tenant_id, is_active);
CREATE INDEX idx_whatsapp_instances_tenant ON public.whatsapp_instances(tenant_id);
