"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export async function addMember(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const email = String(formData.get("email") || "").trim();
  const role = String(formData.get("role") || "member").trim();
  if (!email) redirect("/staff?error=required");

  // In production, this would send an invite email and look up user by email
  // For now, we store a placeholder
  revalidatePath("/staff");
  redirect("/staff?success=invited");
}

export async function updateRole(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "").trim();
  const role = String(formData.get("role") || "").trim();
  if (!id || !role) return;
  await supabase.from("tenant_members").update({ role }).eq("id", id);
  revalidatePath("/staff");
}

export async function removeMember(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  await supabase.from("tenant_members").delete().eq("id", id);
  revalidatePath("/staff");
  redirect("/staff");
}
