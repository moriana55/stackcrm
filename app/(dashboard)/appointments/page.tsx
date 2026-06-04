import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import ModuleGuard from "@/components/module-guard";
import { createAppointment, updateAppointmentStatus } from "@/lib/actions";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  return (
    <ModuleGuard moduleId="appointments" enabledModules={tenant.enabled_modules}>
      <AppointmentsContent tenantId={tenant.id} />
    </ModuleGuard>
  );
}

async function AppointmentsContent({ tenantId }: { tenantId: string }) {
  const supabase = await createClient();

  const [{ data: appointments }, { data: customers }] = await Promise.all([
    supabase.from("appointments").select("*, customers(name, phone)").eq("tenant_id", tenantId).order("appointment_date", { ascending: true }).limit(50),
    supabase.from("customers").select("id, name").eq("tenant_id", tenantId).order("name"),
  ]);

  const list = appointments ?? [];
  const now = new Date();

  const STATUS_STYLE: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    "no-show": "bg-gray-100 text-gray-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">{list.length} appointments</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* New Appointment Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Appointment</h2>
          <form action={createAppointment} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select name="customer_id" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none">
                <option value="">Select...</option>
                {(customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input name="title" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" placeholder="Fitting appointment" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input name="date" type="date" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input name="time" type="time" defaultValue="10:00" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea name="description" rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none resize-y" placeholder="Optional..." />
            </div>
            <button type="submit" className="mt-2 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">Create</button>
          </form>
        </div>

        {/* Appointment List */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {list.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.map((a) => {
                  const cust = (Array.isArray(a.customers) ? a.customers[0] : a.customers) as { name: string; phone: string | null } | null;
                  const dt = new Date(a.appointment_date);
                  const isPast = dt < now && a.status === "pending";
                  return (
                    <tr key={a.id} className={`hover:bg-gray-50 ${isPast ? "bg-red-50/50" : ""}`}>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{cust?.name ?? "—"}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{a.title ?? "—"}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[a.status] ?? STATUS_STYLE.pending}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {a.status === "pending" && (
                          <div className="flex gap-1">
                            <form action={updateAppointmentStatus} className="inline">
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="status" value="confirmed" />
                              <button type="submit" className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">Confirm</button>
                            </form>
                            <form action={updateAppointmentStatus} className="inline">
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="status" value="completed" />
                              <button type="submit" className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">Done</button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-4 block">event</span>
              <h3 className="text-lg font-semibold text-gray-900">No appointments yet</h3>
              <p className="text-sm text-gray-500">Create one using the form.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
