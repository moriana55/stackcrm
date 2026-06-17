"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant, getCurrentMember } from "@/lib/tenant";
import { hasPermission } from "@/lib/rbac";

export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/onboarding");
  const member = await getCurrentMember();
  if (!hasPermission(member?.role, "orders.manage")) redirect("/orders?error=forbidden");

  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!id || !status) return;

  await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", tenant.id);
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  redirect(`/orders/${id}`);
}
