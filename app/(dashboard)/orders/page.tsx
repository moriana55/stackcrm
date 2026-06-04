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
    confirmed: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    delivered: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0} orders · ${totalRevenue.toLocaleString()} total</p>
        </div>
        <Link href="/orders/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined text-lg">add</span>
          New Order
        </Link>
      </div>

      <div className="mb-4">
        <SearchBar placeholder="Search by ref, sales person..." basePath="/orders" />
      </div>

      {list.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ref</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((o) => {
                const cust = (Array.isArray(o.customers) ? o.customers[0] : o.customers) as { name: string } | null;
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono font-medium"><Link href={`/orders/${o.id}`} className="text-gray-900 hover:text-rose-600">{o.ref_no}</Link></td>
                    <td className="px-6 py-4 text-sm text-gray-900">{cust?.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{o.order_type}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {o.order_date ? new Date(o.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium">${Number(o.discounted_total).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className={`font-medium ${Number(o.remaining_balance) > 0 ? "text-red-600" : "text-green-600"}`}>
                        ${Number(o.remaining_balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[o.status] ?? STATUS_STYLE.draft}`}>
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
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-300 mb-4 block">receipt_long</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first sale or rental order.</p>
          <Link href="/orders/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-lg">add</span>
            Create Order
          </Link>
        </div>
      )}
    </div>
  );
}
