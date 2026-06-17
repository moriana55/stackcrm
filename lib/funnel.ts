"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/tenant";

// Funnel olayı kaydı (cohort analitiği için). Sessizce başarısız olur — UX'i bloklamaz.
export async function trackFunnelEvent(
  event: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const member = await getCurrentMember();
    if (!member) return;
    const supabase = await createClient();
    await supabase.from("funnel_events").insert({
      tenant_id: member.tenantId,
      user_id: member.userId,
      event: String(event).slice(0, 80),
      metadata,
    });
  } catch {
    // analitik hatası kullanıcı akışını etkilemez
  }
}
