import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Service-role istemcisi — YALNIZCA güvenli sunucu uçlarında (CRON_SECRET   ║
// ║  korumalı cron'lar) kullanılır. RLS'i baypas eder; ASLA istemciye sızmaz.  ║
// ║                                                                            ║
// ║  Anahtar yoksa null döner (fail-closed). Çağıran taraf bunu kontrol eder.  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
