"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant, getCurrentMember } from "@/lib/tenant";
import { hasPermission } from "@/lib/rbac";

// settings.manage izni gerektirir (fail-closed)
async function requireServiceManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");
  const member = await getCurrentMember();
  if (!hasPermission(member?.role, "settings.manage")) redirect("/services?error=forbidden");
  return { supabase, tenant };
}

export async function createService(formData: FormData) {
  const { supabase, tenant } = await requireServiceManager();

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const duration = parseInt(String(formData.get("duration") || "30")) || 30;
  const price = parseFloat(String(formData.get("price") || "0")) || 0;
  const price_max = parseFloat(String(formData.get("price_max") || "")) || null;
  const description = String(formData.get("description") || "").trim() || null;

  if (!name) redirect("/services?error=required");

  await supabase.from("services").insert({ tenant_id: tenant.id, name, category, duration, price, price_max, description });
  revalidatePath("/services");
  redirect("/services?success=created");
}

export async function deleteService(formData: FormData) {
  const { supabase, tenant } = await requireServiceManager();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  await supabase.from("services").delete().eq("id", id).eq("tenant_id", tenant.id);
  revalidatePath("/services");
  redirect("/services");
}

export async function toggleService(formData: FormData) {
  const { supabase, tenant } = await requireServiceManager();
  const id = String(formData.get("id") || "").trim();
  const is_active = String(formData.get("is_active")) === "true";
  if (!id) return;
  await supabase.from("services").update({ is_active }).eq("id", id).eq("tenant_id", tenant.id);
  revalidatePath("/services");
}
