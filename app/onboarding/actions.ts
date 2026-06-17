"use server";

import { createClient } from "@/lib/supabase/server";
import { PACKS, type PackId } from "@/config/modules";

export type OnboardingDraft = {
  shopName?: string;
  packs?: PackId[];
  services?: { name: string; duration?: number; price?: number }[];
  staff?: { email: string; role: string }[];
  step?: number;
};

// Taslağı yükle (giriş yapan kullanıcı için)
export async function loadDraft(): Promise<OnboardingDraft | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("onboarding_drafts")
    .select("data, step")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { ...(data.data as OnboardingDraft), step: data.step };
}

// Taslağı kaydet (her adımda otomatik)
export async function saveDraft(draft: OnboardingDraft): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const step = Math.max(1, Math.min(4, Number(draft.step) || 1));
  const { error } = await supabase.from("onboarding_drafts").upsert(
    {
      user_id: user.id,
      data: draft,
      step,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  return { ok: !error };
}

type FinishInput = {
  shopName: string;
  packs: PackId[];
  services: { name: string; duration?: number; price?: number }[];
  signupSource?: string;
};

// Onboarding'i tamamla: tenant + üyelik + servisler oluştur, taslağı sil
export async function finishOnboarding(
  input: FinishInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı" };

  // Sınır doğrulaması
  const shopName = String(input.shopName || "").trim();
  if (!shopName) return { ok: false, error: "İşletme adı gerekli" };
  if (shopName.length > 120) return { ok: false, error: "İşletme adı çok uzun" };

  const validPacks = (Array.isArray(input.packs) ? input.packs : [])
    .filter((p): p is PackId => typeof p === "string" && p in PACKS);
  const packs: PackId[] = validPacks.includes("base")
    ? validPacks
    : (["base", ...validPacks] as PackId[]);

  // Zaten bir workspace'i varsa tekrar oluşturma
  const { data: existing } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { ok: true };

  const baseSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = baseSlug ? `${baseSlug}-${Date.now().toString(36)}` : `shop-${Date.now()}`;

  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .insert({
      name: shopName,
      slug,
      owner_id: user.id,
      packs,
      plan: packs.length > 1 ? "starter" : "free",
      signup_source: String(input.signupSource || "direct").slice(0, 60),
      onboarding_completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (tErr || !tenant) return { ok: false, error: tErr?.message || "İşletme oluşturulamadı" };

  const { error: mErr } = await supabase.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: "owner",
  });
  if (mErr) return { ok: false, error: mErr.message };

  // Servisleri ekle (varsa)
  const services = (Array.isArray(input.services) ? input.services : [])
    .map((s) => ({
      name: String(s?.name || "").trim().slice(0, 120),
      duration: Number.isFinite(Number(s?.duration)) ? Math.max(5, Math.min(600, Number(s.duration))) : 30,
      price: Number.isFinite(Number(s?.price)) ? Math.max(0, Number(s.price)) : 0,
    }))
    .filter((s) => s.name.length > 0)
    .slice(0, 50);

  if (services.length > 0) {
    await supabase.from("services").insert(
      services.map((s, i) => ({
        tenant_id: tenant.id,
        name: s.name,
        duration: s.duration,
        price: s.price,
        sort_order: i,
      }))
    );
  }

  // Funnel: signup olayı
  await supabase.from("funnel_events").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    event: "onboarding_completed",
    metadata: { packs, service_count: services.length },
  });

  // Taslağı temizle
  await supabase.from("onboarding_drafts").delete().eq("user_id", user.id);

  return { ok: true };
}
