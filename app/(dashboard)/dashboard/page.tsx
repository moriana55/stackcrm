import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { MODULES } from "@/config/modules";
import { RevenueChart, AppointmentChart, StatusPieChart } from "@/components/charts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const hasSales = tenant.enabled_modules.includes("sales");
  const hasAppointments = tenant.enabled_modules.includes("appointments");

  const [
    { count: customerCount },
    { count: orderCount },
    { count: productCount },
    { count: appointmentCount },
  ] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Customers", value: customerCount ?? 0, icon: "groups", href: "/customers", module: "crm" as const },
    { label: "Appointments", value: appointmentCount ?? 0, icon: "event", href: "/appointments", module: "appointments" as const },
    { label: "Orders", value: orderCount ?? 0, icon: "receipt_long", href: "/orders", module: "sales" as const },
    { label: "Products", value: productCount ?? 0, icon: "checkroom", href: "/products", module: "inventory" as const },
  ].filter((s) => tenant.enabled_modules.includes(s.module));

  // Revenue data (6 months)
  let revenueData: { month: string; revenue: number }[] = [];
  if (hasSales) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const { data: orders6m } = await supabase
      .from("orders")
      .select("created_at, discounted_total")
      .gte("created_at", sixMonthsAgo.toISOString());

    const map: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      map[`${d.getFullYear()}-${d.getMonth()}`] = 0;
    }
    for (const o of orders6m ?? []) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in map) map[key] += Number(o.discounted_total ?? 0);
    }
    revenueData = Object.entries(map).map(([key, revenue]) => ({
      month: MONTHS[parseInt(key.split("-")[1])],
      revenue,
    }));
  }

  // Appointment data (this week)
  let appointmentData: { day: string; count: number }[] = [];
  if (hasAppointments) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data: weekAppts } = await supabase
      .from("appointments")
      .select("appointment_date")
      .gte("appointment_date", weekStart.toISOString())
      .lt("appointment_date", weekEnd.toISOString());

    const dayCounts = Array(7).fill(0);
    for (const a of weekAppts ?? []) {
      const d = new Date(a.appointment_date).getDay();
      const idx = d === 0 ? 6 : d - 1;
      dayCounts[idx]++;
    }
    appointmentData = DAYS.map((day, i) => ({ day, count: dayCounts[i] }));
  }

  // Order status breakdown
  let orderStatusData: { name: string; value: number }[] = [];
  if (hasSales) {
    const { data: allOrders } = await supabase.from("orders").select("status");
    const statusMap: Record<string, number> = {};
    for (const o of allOrders ?? []) {
      statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    }
    orderStatusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">{greeting} 👋</h1>
        <p className="text-gray-500 mt-1">{tenant.name} — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6 hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-2xl text-gray-400 mb-3 block">{stat.icon}</span>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      {(hasSales || hasAppointments) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {hasSales && revenueData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <RevenueChart data={revenueData} />
            </div>
          )}
          {hasAppointments && appointmentData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <AppointmentChart data={appointmentData} />
            </div>
          )}
          {hasSales && orderStatusData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <StatusPieChart data={orderStatusData} title="Order Status" />
            </div>
          )}
        </div>
      )}

      {/* Active Modules */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tenant.enabled_modules.map((moduleId) => {
            const mod = MODULES[moduleId];
            if (!mod) return null;
            return (
              <Link key={moduleId} href={mod.navItems[0]?.href ?? "#"} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all">
                <span className="material-symbols-outlined text-xl text-gray-600">{mod.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{mod.name}</div>
                  <div className="text-xs text-gray-400">{mod.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
