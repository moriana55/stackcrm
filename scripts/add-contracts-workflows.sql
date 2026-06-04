-- Contracts & E-Sign
CREATE TABLE IF NOT EXISTS public.contracts (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id      uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id   uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title         text NOT NULL,
  content       text NOT NULL,
  total_amount  numeric(12,2) DEFAULT 0,
  status        text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'expired')),
  token         text NOT NULL UNIQUE,
  signed_at     timestamptz,
  signature_data text,
  ip_address    text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

-- Automated Workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  trigger_type  text NOT NULL CHECK (trigger_type IN ('appointment_created', 'appointment_confirmed', 'order_created', 'order_delivered', 'payment_received', 'customer_created', 'try_on_logged')),
  action_type   text NOT NULL CHECK (action_type IN ('send_email', 'send_reminder', 'update_status', 'create_task', 'request_review')),
  action_config jsonb DEFAULT '{}'::jsonb,
  delay_minutes integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

-- Trunk Shows
CREATE TABLE IF NOT EXISTS public.trunk_shows (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  vendor        text,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  status        text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trunk_show_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trunk_show_id uuid NOT NULL REFERENCES public.trunk_shows(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES public.products(id) ON DELETE SET NULL,
  gown_name     text NOT NULL,
  size          text,
  status        text DEFAULT 'available' CHECK (status IN ('available', 'tried', 'reserved', 'returned')),
  try_count     integer DEFAULT 0,
  notes         text
);

-- RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trunk_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trunk_show_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_contracts" ON public.contracts FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "contract_public_read" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "tenant_workflows" ON public.workflows FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "tenant_trunk_shows" ON public.trunk_shows FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "tenant_trunk_show_items" ON public.trunk_show_items FOR ALL USING (true);
