import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import ModuleGuard from "@/components/module-guard";
import SearchBar from "@/components/search-bar";
import PortalLinkButton from "@/components/portal-link-button";

type PageProps = { searchParams?: Promise<{ q?: string }> };

export default async function CustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  return (
    <ModuleGuard moduleId="crm" enabledModules={tenant.enabled_modules}>
      <CustomersContent tenantId={tenant.id} query={params?.q ?? ""} />
    </ModuleGuard>
  );
}

async function CustomersContent({ tenantId, query }: { tenantId: string; query: string }) {
  const supabase = await createClient();

  let q = supabase.from("customers").select("*", { count: "exact" }).eq("tenant_id", tenantId);

  if (query) {
    const p = `%${query}%`;
    q = q.or(`name.ilike.${p},phone.ilike.${p},email.ilike.${p}`);
  }

  const { data: customers, count } = await q.order("created_at", { ascending: false }).limit(50);
  const list = customers ?? [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0} total</p>
        </div>
        <Link href="/customers/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined text-lg">add</span>
          New Customer
        </Link>
      </div>

      <div className="mb-4">
        <SearchBar placeholder="Search by name, phone, email..." basePath="/customers" />
      </div>

      {list.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4"><Link href={`/customers/${c.id}`} className="font-medium text-gray-900 hover:text-rose-600">{c.name}</Link></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.phone ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.email ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{c.status ?? "new"}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-6 py-4">
                    <PortalLinkButton customerId={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-300 mb-4 block">groups</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{query ? "No results found" : "No customers yet"}</h3>
          <p className="text-sm text-gray-500 mb-4">{query ? "Try a different search term." : "Add your first customer to get started."}</p>
          {!query && (
            <Link href="/customers/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <span className="material-symbols-outlined text-lg">add</span>
              Add Customer
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
