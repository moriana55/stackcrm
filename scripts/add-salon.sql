-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BookStack — Salon & Spa tables                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Services (hizmet menüsü)
CREATE TABLE IF NOT EXISTS public.services (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  category      text,
  duration      integer NOT NULL DEFAULT 30,
  price         numeric(12,2) DEFAULT 0,
  price_max     numeric(12,2),
  description   text,
  is_active     boolean DEFAULT true,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- Staff schedules (çalışma saatleri)
CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.tenant_members(id) ON DELETE CASCADE,
  day_of_week   integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    time NOT NULL DEFAULT '09:00',
  end_time      time NOT NULL DEFAULT '18:00',
  break_start   time,
  break_end     time,
  is_off        boolean DEFAULT false
);

-- Staff-service mapping (kim ne yapabiliyor)
CREATE TABLE IF NOT EXISTS public.staff_services (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id     uuid NOT NULL REFERENCES public.tenant_members(id) ON DELETE CASCADE,
  service_id    uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  UNIQUE(member_id, service_id)
);

-- Staff profiles (ek bilgiler)
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS is_bookable boolean DEFAULT true;

-- Bookings (online randevular)
CREATE TABLE IF NOT EXISTS public.bookings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id     uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  member_id       uuid REFERENCES public.tenant_members(id) ON DELETE SET NULL,
  service_id      uuid REFERENCES public.services(id) ON DELETE SET NULL,
  customer_name   text NOT NULL,
  customer_phone  text,
  customer_email  text,
  booking_date    date NOT NULL,
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  status          text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  notes           text,
  source          text DEFAULT 'online' CHECK (source IN ('online', 'walk_in', 'phone', 'instagram', 'google')),
  amount          numeric(12,2) DEFAULT 0,
  tip_amount      numeric(12,2) DEFAULT 0,
  payment_method  text,
  paid            boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Staff time-off (izinler)
CREATE TABLE IF NOT EXISTS public.staff_time_off (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.tenant_members(id) ON DELETE CASCADE,
  date          date NOT NULL,
  reason        text,
  created_at    timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_services" ON public.services FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "public_services_read" ON public.services FOR SELECT USING (true);
CREATE POLICY "tenant_staff_schedules" ON public.staff_schedules FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "public_schedules_read" ON public.staff_schedules FOR SELECT USING (true);
CREATE POLICY "public_staff_services_read" ON public.staff_services FOR SELECT USING (true);
CREATE POLICY "tenant_staff_services" ON public.staff_services FOR ALL USING (true);
CREATE POLICY "tenant_bookings" ON public.bookings FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "public_bookings_insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "tenant_time_off" ON public.staff_time_off FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_member ON public.bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_member ON public.staff_schedules(member_id);
