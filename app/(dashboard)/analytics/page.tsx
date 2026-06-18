import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant, getCurrentMember } from "@/lib/tenant";
import { roleAtLeast } from "@/lib/rbac";
import { RevenueBars, FillLine, StaffBars, DistributionPie } from "@/components/analytics-charts";
import RangeFilter from "./range-filter";

export const dynamic = "force-dynamic";

const tl = (v: number) => `₺${Number(v || 0).toLocaleString("tr-TR")}`;
const TR_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

type Props = { searchParams: Promise<{ range?: string }> };

export default async function AnalyticsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  // RBAC: analiz yönetim düzeyidir — yalnızca owner/admin (fail-closed).
  const member = await getCurrentMember();
  if (!roleAtLeast(member?.role, "admin")) redirect("/dashboard?error=forbidden");

  const sp = await searchParams;
  const rangeDays = Math.min(365, Math.max(7, parseInt(sp.range ?? "30") || 30));

  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - rangeDays + 1);
  since.setHours(0, 0, 0, 0);
  const sinceISO = since.toISOString();
  const sinceDate = sinceISO.slice(0, 10);

  const hasSales = tenant.enabled_modules.includes("sales");
  const hasAppointments = tenant.enabled_modules.includes("appointments");
  const hasInventory = tenant.enabled_modules.includes("inventory");
  const hasBooking = tenant.enabled_modules.includes("booking");

  // ── Veri çekimi (tenant-scoped, RLS) ──────────────────────────────────────
  const [ordersRes, apptRes, bookingsRes, productsRes] = await Promise.all([
    hasSales
      ? supabase.from("orders").select("created_at, discounted_total, status").gte("created_at", sinceISO)
      : Promise.resolve({ data: [] as any[] }),
    hasAppointments
      ? supabase.from("appointments").select("appointment_date, status").gte("appointment_date", sinceISO)
      : Promise.resolve({ data: [] as any[] }),
    hasBooking
      ? supabase.from("bookings").select("amount, member_id, status, booking_date, tenant_members(display_name)").gte("booking_date", sinceDate)
      : Promise.resolve({ data: [] as any[] }),
    hasInventory
      ? supabase.from("products").select("category, stock_quantity, price")
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const orders = (ordersRes.data ?? []) as { created_at: string; discounted_total: number; status: string }[];
  const appts = (apptRes.data ?? []) as { appointment_date: string; status: string }[];
  const bookings = (bookingsRes.data ?? []) as { amount: number; member_id: string | null; status: string; booking_date: string; tenant_members: { display_name: string | null } | { display_name: string | null }[] | null }[];
  const products = (productsRes.data ?? []) as { category: string | null; stock_quantity: number; price: number }[];

  // ── KPI'lar ────────────────────────────────────────────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + Number(o.discounted_total || 0), 0);
  const bookingRevenue = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + Number(b.amount || 0), 0);
  const apptTotal = appts.length;
  const apptDone = appts.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const fillRate = apptTotal > 0 ? Math.round((apptDone / apptTotal) * 100) : 0;

  // ── Gelir zaman serisi (günlük veya aylık otomatik) ────────────────────────
  let revenueSeries: { label: string; value: number }[] = [];
  if (hasSales) {
    if (rangeDays <= 31) {
      const map: Record<string, number> = {};
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        map[d.toISOString().slice(0, 10)] = 0;
      }
      for (const o of orders) {
        const key = new Date(o.created_at).toISOString().slice(0, 10);
        if (key in map) map[key] += Number(o.discounted_total || 0);
      }
      revenueSeries = Object.entries(map).map(([k, v]) => ({ label: k.slice(5), value: v }));
    } else {
      const map = new Map<string, number>();
      const months = Math.ceil(rangeDays / 30);
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        map.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
      }
      for (const o of orders) {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (map.has(key)) map.set(key, (map.get(key) ?? 0) + Number(o.discounted_total || 0));
      }
      revenueSeries = [...map.entries()].map(([k]) => {
        const [, m] = k.split("-").map(Number);
        const d = new Date(2000, m, 1);
        return { label: d.toLocaleDateString("tr-TR", { month: "short" }), value: map.get(k) ?? 0 };
      });
    }
  }

  // ── Randevu doluluk (haftanın günlerine göre, kapasite = randevu kabul gün) ─
  let fillSeries: { label: string; booked: number; capacity: number }[] = [];
  if (hasAppointments) {
    const booked = Array(7).fill(0);
    for (const a of appts) {
      const dow = new Date(a.appointment_date).getDay();
      booked[dow === 0 ? 6 : dow - 1]++;
    }
    // Kapasite referansı: o güne düşen tarih sayısı (range içindeki gün sayısı).
    const cap = Array(7).fill(0);
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      cap[dow === 0 ? 6 : dow - 1]++;
    }
    fillSeries = TR_DAYS.map((label, i) => ({ label, booked: booked[i], capacity: cap[i] }));
  }

  // ── Personel performansı (booking gelirine göre) ───────────────────────────
  let staffSeries: { label: string; value: number }[] = [];
  if (hasBooking) {
    const map = new Map<string, number>();
    for (const b of bookings) {
      if (b.status === "cancelled" || b.status === "no_show") continue;
      const tm = Array.isArray(b.tenant_members) ? b.tenant_members[0] : b.tenant_members;
      const name = tm?.display_name ?? "Atanmamış";
      map.set(name, (map.get(name) ?? 0) + Number(b.amount || 0));
    }
    staffSeries = [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }

  // ── Envanter (kategori bazında stok dağılımı) ──────────────────────────────
  let inventorySeries: { name: string; value: number }[] = [];
  let stockValue = 0;
  let lowStock = 0;
  if (hasInventory) {
    const map = new Map<string, number>();
    for (const p of products) {
      const cat = p.category || "Diğer";
      map.set(cat, (map.get(cat) ?? 0) + Number(p.stock_quantity || 0));
      stockValue += Number(p.stock_quantity || 0) * Number(p.price || 0);
      if (Number(p.stock_quantity || 0) <= 2) lowStock++;
    }
    inventorySeries = [...map.entries()].map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);
  }

  const noModules = !hasSales && !hasAppointments && !hasInventory && !hasBooking;

  const kpis = [
    hasSales && { label: "Toplam Gelir", value: tl(totalRevenue), sub: "siparişler" },
    hasBooking && { label: "Randevu Geliri", value: tl(bookingRevenue), sub: "tamamlanan" },
    hasAppointments && { label: "Randevu Doluluk", value: `%${fillRate}`, sub: `${apptDone}/${apptTotal}` },
    hasInventory && { label: "Stok Değeri", value: tl(stockValue), sub: `${lowStock} düşük stok` },
  ].filter(Boolean) as { label: string; value: string; sub: string }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 tracking-tight">Analitik</h1>
          <p className="text-gray-500 mt-1">{tenant.name} — performans özeti</p>
        </div>
        <RangeFilter current={String(rangeDays)} />
      </div>

      {noModules ? (
        <div className="bs-card p-12 text-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto mb-3 material-symbols-outlined text-3xl">insights</span>
          <p className="text-gray-500 max-w-md mx-auto">Analitik için etkin bir modül bulunamadı. Satış, randevu, rezervasyon veya envanter modülünü etkinleştirin.</p>
        </div>
      ) : (
        <>
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((k) => (
                <div key={k.label} className="bs-card p-5">
                  <div className="bs-eyebrow">{k.label}</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1.5 tabular-nums">{k.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {hasSales && (
              <div className="bs-card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Gelir</h3>
                <RevenueBars data={revenueSeries} />
              </div>
            )}
            {hasAppointments && (
              <div className="bs-card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Randevu Doluluk (gün)</h3>
                <FillLine data={fillSeries} />
              </div>
            )}
            {hasBooking && (
              <div className="bs-card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Personel Performansı</h3>
                <StaffBars data={staffSeries} />
              </div>
            )}
            {hasInventory && (
              <div className="bs-card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Envanter Dağılımı (kategori)</h3>
                <DistributionPie data={inventorySeries} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
