"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export async function addTryOn(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const customer_id = String(formData.get("customer_id") || "").trim();
  const product_id = String(formData.get("product_id") || "").trim();
  const reaction = String(formData.get("reaction") || "").trim() || null;
  const rating = parseInt(String(formData.get("rating") || "")) || null;
  const stylist = String(formData.get("stylist") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!customer_id || !product_id) redirect("/try-ons?error=required");

  await supabase.from("try_ons").insert({
    tenant_id: tenant.id, customer_id, product_id, reaction, rating, stylist, notes, created_by: user.id,
  });

  await supabase.from("products").update({
    lifecycle_stage: "in_fitting", lifecycle_updated_at: new Date().toISOString(),
  }).eq("id", product_id);

  await supabase.from("product_lifecycle_log").insert({
    tenant_id: tenant.id, product_id, to_stage: "in_fitting", notes: `Try-on by customer`, created_by: user.id,
  });

  revalidatePath("/try-ons");
  redirect("/try-ons?success=logged");
}
