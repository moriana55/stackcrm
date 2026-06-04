-- Try-On Tracking
CREATE TABLE IF NOT EXISTS public.try_ons (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stylist       text,
  rating        integer CHECK (rating BETWEEN 1 AND 5),
  reaction      text CHECK (reaction IN ('loved', 'liked', 'maybe', 'no')),
  photo_urls    text[] DEFAULT '{}',
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

-- Gown Lifecycle Stages
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'in_stock'
  CHECK (lifecycle_stage IN ('ordered', 'in_transit', 'in_stock', 'on_display', 'in_fitting', 'sold', 'in_alteration', 'ready', 'delivered', 'returned'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lifecycle_updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.product_lifecycle_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_stage    text,
  to_stage      text NOT NULL,
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

-- Client Portal tokens
CREATE TABLE IF NOT EXISTS public.portal_tokens (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token         text NOT NULL UNIQUE,
  expires_at    timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.try_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_lifecycle_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_try_ons" ON public.try_ons FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "tenant_lifecycle_log" ON public.product_lifecycle_log FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "tenant_portal_tokens" ON public.portal_tokens FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
-- Public read for portal
CREATE POLICY "portal_public_read" ON public.portal_tokens FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_try_ons_customer ON public.try_ons(customer_id);
CREATE INDEX IF NOT EXISTS idx_try_ons_product ON public.try_ons(product_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_log_product ON public.product_lifecycle_log(product_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON public.portal_tokens(token);
