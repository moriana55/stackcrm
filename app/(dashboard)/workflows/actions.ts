"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export async function createWorkflow(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const name = String(formData.get("name") || "").trim();
  const trigger_type = String(formData.get("trigger_type") || "").trim();
  const action_type = String(formData.get("action_type") || "").trim();
  const delay_minutes = parseInt(String(formData.get("delay_minutes") || "0")) || 0;

  if (!name || !trigger_type || !action_type) redirect("/workflows?error=required");

  await supabase.from("workflows").insert({ tenant_id: tenant.id, name, trigger_type, action_type, delay_minutes, created_by: user.id });
  revalidatePath("/workflows");
  redirect("/workflows?success=created");
}

export async function toggleWorkflow(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "").trim();
  const is_active = String(formData.get("is_active")) === "true";
  if (!id) return;
  await supabase.from("workflows").update({ is_active }).eq("id", id);
  revalidatePath("/workflows");
}

export async function deleteWorkflow(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  await supabase.from("workflows").delete().eq("id", id);
  revalidatePath("/workflows");
  redirect("/workflows");
}
