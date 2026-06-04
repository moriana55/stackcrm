"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export async function createTrunkShow(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const name = String(formData.get("name") || "").trim();
  const vendor = String(formData.get("vendor") || "").trim() || null;
  const start_date = String(formData.get("start_date") || "").trim();
  const end_date = String(formData.get("end_date") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name || !start_date || !end_date) redirect("/trunk-shows?error=required");

  await supabase.from("trunk_shows").insert({ tenant_id: tenant.id, name, vendor, start_date, end_date, notes, created_by: user.id });
  revalidatePath("/trunk-shows");
  redirect("/trunk-shows?success=created");
}
