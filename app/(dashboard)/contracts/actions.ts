"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export async function createContract(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");

  const customer_id = String(formData.get("customer_id") || "").trim();
  const order_id = String(formData.get("order_id") || "").trim() || null;
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const total_amount = parseFloat(String(formData.get("total_amount") || "0")) || 0;

  if (!customer_id || !title || !content) redirect("/contracts?error=required");

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);

  await supabase.from("contracts").insert({
    tenant_id: tenant.id, customer_id, order_id, title, content, total_amount,
    token, status: "sent", created_by: user.id,
  });

  revalidatePath("/contracts");
  redirect("/contracts?success=created");
}
