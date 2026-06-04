"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateCustomer(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const status = String(formData.get("status") || "new").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!id || !name) redirect(`/customers/${id}?error=required`);

  await supabase.from("customers").update({ name, phone, email, status, notes, updated_at: new Date().toISOString() }).eq("id", id);

  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  redirect(`/customers/${id}?success=updated`);
}
