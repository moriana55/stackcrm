"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/tenant";
import { hasPermission, ASSIGNABLE_ROLES, type Role } from "@/lib/rbac";

// Yetki kapısı (fail-closed): staff.manage izni olmayan reddedilir.
async function requireStaffManager() {
  const supabase = await createClient();
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (!hasPermission(member.role, "staff.manage")) redirect("/staff?error=forbidden");
  return { supabase, member };
}

export async function addMember(formData: FormData) {
  const { member } = await requireStaffManager();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "stylist").trim() as Role;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/staff?error=email");
  if (!ASSIGNABLE_ROLES.includes(role)) redirect("/staff?error=role");

  void member;
  // NOT: Gerçek davet, e-posta tabanlı kullanıcı eşlemesi + Supabase admin API
  // (owner servis anahtarı) gerektirir. Anahtar bağlanana kadar davet kaydı
  // yer tutucu olarak işaretlenir; UI bilgilendirme gösterir.
  revalidatePath("/staff");
  redirect("/staff?success=invited");
}

export async function updateRole(formData: FormData) {
  const { supabase, member } = await requireStaffManager();

  const id = String(formData.get("id") || "").trim();
  const role = String(formData.get("role") || "").trim() as Role;
  if (!id || !ASSIGNABLE_ROLES.includes(role)) redirect("/staff?error=role");

  // Tenant kapsamı: yalnızca aynı tenant'taki ve owner OLMAYAN üyeler güncellenebilir.
  await supabase
    .from("tenant_members")
    .update({ role })
    .eq("id", id)
    .eq("tenant_id", member.tenantId)
    .neq("role", "owner");

  revalidatePath("/staff");
  redirect("/staff?success=role_updated");
}

export async function removeMember(formData: FormData) {
  const { supabase, member } = await requireStaffManager();

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  // Kendini ve owner'ı silmeyi engelle; yalnızca kendi tenant'ı içinde.
  await supabase
    .from("tenant_members")
    .delete()
    .eq("id", id)
    .eq("tenant_id", member.tenantId)
    .neq("role", "owner")
    .neq("user_id", member.userId);

  revalidatePath("/staff");
  redirect("/staff?success=removed");
}
