import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { addMember, updateRole, removeMember } from "./actions";

const ROLES = ["owner", "admin", "member", "viewer"];

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const { data: members } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("created_at");

  const list = members ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team & Roles</h1>
        <p className="text-sm text-gray-500 mt-1">Manage who has access and what they can do</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Member</h2>
          <form action={addMember} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none" placeholder="team@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select name="role" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none">
                <option value="member">Member (can manage customers & orders)</option>
                <option value="admin">Admin (full access except billing)</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
            </div>
            <button type="submit" className="mt-2 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">Send Invite</button>
          </form>
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">The invited person must have a BridalStack account. They'll see this shop after signing in.</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{m.user_id.slice(0, 8)}...{m.user_id === user.id ? " (you)" : ""}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${m.role === "owner" ? "bg-rose-100 text-rose-700" : m.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="px-6 py-4">
                    {m.role !== "owner" && m.user_id !== user.id && (
                      <form action={removeMember} className="inline">
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
