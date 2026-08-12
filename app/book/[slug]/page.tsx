import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import BookingForm from "./booking-form";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, logo_url, accent_color, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, category, duration, price, price_max, description")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  const { data: members } = await supabase
    .from("tenant_members")
    .select("id, display_name, title, photo_url, is_bookable")
    .eq("tenant_id", tenant.id)
    .eq("is_bookable", true);

  const { data: staffServices } = await supabase
    .from("staff_services")
    .select("member_id, service_id");

  const { data: schedules } = await supabase
    .from("staff_schedules")
    .select("member_id, day_of_week, start_time, end_time, break_start, break_end, is_off")
    .in("member_id", (members ?? []).map((m) => m.id));

  const accent = (tenant.accent_color as string) ?? "#b4496a";

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Soft brand-tinted top band */}
      <div className="h-32 w-full" style={{ background: `linear-gradient(180deg, ${accent}14 0%, ${accent}05 60%, transparent 100%)` }} />

      <div className="max-w-xl w-full mx-auto px-4 -mt-20 flex-1">
        <header className="text-center mb-7">
          {tenant.logo_url ? (
            <Image unoptimized src={tenant.logo_url as string} alt={tenant.name} width={160} height={64} className="h-16 w-auto mx-auto mb-4 object-contain" />
          ) : (
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-white text-2xl font-semibold shadow-sm"
              style={{ backgroundColor: accent }}
            >
              {tenant.name.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{tenant.name}</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Birkaç adımda online randevunuzu oluşturun</p>
        </header>

        <BookingForm
          tenantId={tenant.id}
          accent={accent}
          services={services ?? []}
          staff={(members ?? []).map((m) => ({
            id: m.id,
            name: m.display_name ?? "Staff",
            title: m.title,
            photo: m.photo_url,
            serviceIds: (staffServices ?? []).filter((ss) => ss.member_id === m.id).map((ss) => ss.service_id),
          }))}
          schedules={(schedules ?? []).map((s) => ({
            memberId: s.member_id,
            dayOfWeek: s.day_of_week,
            startTime: s.start_time,
            endTime: s.end_time,
            breakStart: s.break_start,
            breakEnd: s.break_end,
            isOff: s.is_off,
          }))}
        />
      </div>

      <footer className="text-center py-8 mt-6">
        <p className="text-xs text-gray-400 inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">bolt</span>
          BridalStack ile güçlendirildi
        </p>
      </footer>
    </div>
  );
}
