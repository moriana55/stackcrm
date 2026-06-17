import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
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

  const accent = (tenant.accent_color as string) ?? "#e11d48";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b border-gray-100 px-6 py-6 text-center">
        {tenant.logo_url && (
          <img src={tenant.logo_url as string} alt={tenant.name} className="h-12 mx-auto mb-3 object-contain" />
        )}
        <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
        <p className="text-gray-500 mt-1">Book an appointment online</p>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8">
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

      <footer className="text-center py-6">
        <p className="text-xs text-gray-400">Powered by StackCRM</p>
      </footer>
    </div>
  );
}
