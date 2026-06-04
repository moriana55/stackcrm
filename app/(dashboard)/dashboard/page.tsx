import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { MODULES } from "@/config/modules";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {greeting} 👋
        </h1>
        <p className="text-gray-500 mt-1">{tenant.name} — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="material-symbols-outlined text-2xl text-gray-400">{stat.icon}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Modules</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {tenant.enabled_modules.map((moduleId) => {
            const mod = MODULES[moduleId];
            if (!mod) return null;
            return (
              <Link
                key={moduleId}
                href={mod.navItems[0]?.href ?? "#"}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
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
