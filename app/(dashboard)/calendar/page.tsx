import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import ModuleGuard from "@/components/module-guard";
import CalendarView from "./calendar-view";

type PageProps = { searchParams?: Promise<{ month?: string }> };

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const now = new Date();
  const monthParam = params?.month;
  const [year, month] = monthParam ? monthParam.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, title, appointment_date, status, customers(name)")
    .eq("tenant_id", tenant.id)
    .gte("appointment_date", start.toISOString())
    .lte("appointment_date", end.toISOString())
    .order("appointment_date");

  const events = (appointments ?? []).map((a) => {
    const cust = (Array.isArray(a.customers) ? a.customers[0] : a.customers) as { name: string } | null;
    return {
      id: a.id,
      title: a.title ?? "Appointment",
      customerName: cust?.name ?? "",
      date: a.appointment_date,
      status: a.status,
    };
  });

  return (
    <ModuleGuard moduleId="appointments" enabledModules={tenant.enabled_modules}>
      <CalendarView events={events} year={year} month={month} />
    </ModuleGuard>
  );
}
