import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import ModuleGuard from "@/components/module-guard";
import SearchBar from "@/components/search-bar";

type PageProps = { searchParams?: Promise<{ q?: string }> };

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  return (
    <ModuleGuard moduleId="sales" enabledModules={tenant.enabled_modules}>
      <OrdersContent tenantId={tenant.id} query={params?.q ?? ""} />
    </ModuleGuard>
  );
}

async function OrdersContent({ tenantId, query }: { tenantId: string; query: string }) {
  const supabase = await createClient();

  let q = supabase.from("orders").select("*, customers(name)", { count: "exact" }).eq("tenant_id", tenantId);
  if (query) {
    q = q.or(`ref_no.ilike.%${query}%,sales_person.ilike.%${query}%`);
  }
  const { data: orders, count } = await q.order("created_at", { ascending: false }).limit(50);

  const list = orders ?? [];
  const totalRevenue = list.reduce((s, o) => s + Number(o.discounted_total ?? 0), 0);

  const STATUS_STYLE: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    confirmed: "bg-blue-50 text-blue-700",
    in_progress: "bg-amber-50 text-amber-700",
    delivered: "bg-emerald-50 text-emerald-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Siparişler</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0} sipariş · ${totalRevenue.toLocaleString()} toplam</p>
        </div>
        <Link href="/orders/new" className="bs-btn-dark">
          <span className="material-symbols-outlined text-lg">add</span>
          Yeni Sipariş
        </Link>
      </div>

      <div className="mb-4">
        <SearchBar placeholder="Referans veya satış temsilcisi ara..." basePath="/orders" />
      </div>

      {list.length > 0 ? (
        <div className="bs-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="bs-th">Referans</th>
                <th className="bs-th">Müşteri</th>
                <th className="bs-th">Tür</th>
                <th className="bs-th">Tarih</th>
                <th className="bs-th text-right">Tutar</th>
                <th className="bs-th text-right">Bakiye</th>
                <th className="bs-th">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((o) => {
                const cust = (Array.isArray(o.customers) ? o.customers[0] : o.customers) as { name: string } | null;
                return (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-medium"><Link href={`/orders/${o.id}`} className="text-gray-900 hover:text-[var(--accent)] transition-colors">{o.ref_no}</Link></td>
                    <td className="px-6 py-4 text-sm text-gray-900">{cust?.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className="bs-badge bg-gray-100 text-gray-600 capitalize">{o.order_type}</span>
                    </td>
                    <td className="bs-td">
                      {o.order_date ? new Date(o.order_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium tabular-nums text-gray-900">${Number(o.discounted_total).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right tabular-nums">
                      <span className={`font-medium ${Number(o.remaining_balance) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        ${Number(o.remaining_balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`bs-badge capitalize ${STATUS_STYLE[o.status] ?? STATUS_STYLE.draft}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bs-card p-16 text-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto mb-4 material-symbols-outlined text-3xl">receipt_long</span>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Henüz sipariş yok</h3>
          <p className="text-sm text-gray-500 mb-5">İlk satış veya kiralama siparişinizi oluşturun.</p>
          <Link href="/orders/new" className="bs-btn-dark">
            <span className="material-symbols-outlined text-lg">add</span>
            Sipariş Oluştur
          </Link>
        </div>
      )}
    </div>
  );
}
