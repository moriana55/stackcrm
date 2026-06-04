import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import ModuleGuard from "@/components/module-guard";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  return (
    <ModuleGuard moduleId="inventory" enabledModules={tenant.enabled_modules}>
      <ProductsContent tenantId={tenant.id} />
    </ModuleGuard>
  );
}

async function ProductsContent({ tenantId }: { tenantId: string }) {
  const supabase = await createClient();

  const { data: products, count } = await supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = products ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0} items in inventory</p>
        </div>
        <Link href="/products/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined text-lg">add</span>
          New Product
        </Link>
      </div>

      {list.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cost</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Margin</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((p) => {
                const margin = p.price > 0 && p.cost > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : null;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.barcode}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.sku ?? "—"}</td>
                    <td className="px-6 py-4">
                      {p.category ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.category}</span> : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium">${Number(p.price).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-500">${Number(p.cost).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      {margin !== null ? (
                        <span className={`font-medium ${margin >= 50 ? "text-green-600" : margin >= 30 ? "text-amber-600" : "text-red-600"}`}>{margin}%</span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className={`font-medium ${p.stock_quantity <= 0 ? "text-red-600" : "text-gray-900"}`}>{p.stock_quantity}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-300 mb-4 block">checkroom</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No products yet</h3>
          <p className="text-sm text-gray-500 mb-4">Add your inventory to start tracking.</p>
          <Link href="/products/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-lg">add</span>
            Add Product
          </Link>
        </div>
      )}
    </div>
  );
}
