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
          <h1 className="text-2xl font-semibold text-gray-900">Müşteriler</h1>
          <p className="text-sm text-gray-500 mt-1">Toplam {count ?? 0}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers/import" className="bs-btn-ghost">
            <span className="material-symbols-outlined text-lg">upload_file</span>
            İçe Aktar
          </Link>
          <Link href="/customers/new" className="bs-btn-dark">
            <span className="material-symbols-outlined text-lg">add</span>
            Yeni Müşteri
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <SearchBar placeholder="İsim, telefon veya e-posta ara..." basePath="/customers" />
      </div>

      {list.length > 0 ? (
        <div className="bs-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="bs-th">Ad</th>
                <th className="bs-th">Telefon</th>
                <th className="bs-th">E-posta</th>
                <th className="bs-th">Durum</th>
                <th className="bs-th">Eklendi</th>
                <th className="bs-th">Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-6 py-4"><Link href={`/customers/${c.id}`} className="font-medium text-gray-900 hover:text-[var(--accent)] transition-colors">{c.name}</Link></td>
                  <td className="bs-td">{c.phone ?? "—"}</td>
                  <td className="bs-td">{c.email ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className="bs-badge bg-gray-100 text-gray-700">{c.status ?? "new"}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(c.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
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
        <div className="bs-card p-16 text-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto mb-4 material-symbols-outlined text-3xl">groups</span>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{query ? "Sonuç bulunamadı" : "Henüz müşteri yok"}</h3>
          <p className="text-sm text-gray-500 mb-5">{query ? "Farklı bir arama terimi deneyin." : "Başlamak için ilk müşterinizi ekleyin."}</p>
          {!query && (
            <Link href="/customers/new" className="bs-btn-dark">
              <span className="material-symbols-outlined text-lg">add</span>
              Müşteri Ekle
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
