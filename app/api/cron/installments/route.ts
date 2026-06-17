import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail, installmentReminderEmail } from "@/lib/email";
import { deriveStatus, reminderFor } from "@/lib/installments";

export const dynamic = "force-dynamic";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Taksit otomasyonu cron'u — CRON_SECRET korumalı, fail-closed.            ║
// ║  1) Ödenmemiş taksitlerin durumunu (pending→due→overdue) günceller.       ║
// ║  2) Vade penceresine göre hatırlatma e-postası kuyruğa alır (deduplike).  ║
// ║  NOT: Gerçek Stripe tekrarlı tahsilat, mevcut Stripe env'ine bağlı olarak  ║
// ║  sonraya bırakıldı; burada SADECE plan/durum/hatırlatma yürütülür.        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export async function GET(req: NextRequest) {
  // Auth: CRON_SECRET tanımlı değilse fail-closed (çalıştırma).
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS'i baypas etmek için service-role gerekir; yoksa güvenli şekilde dur.
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY ayarlı değil; cron devre dışı (fail-closed).", processed: 0 },
      { status: 503 }
    );
  }

  const now = new Date();

  // Yalnızca açık (ödenmemiş/iptal olmayan) taksitleri al.
  const { data: installments, error } = await supabase
    .from("installments")
    .select("id, tenant_id, customer_id, amount, due_date, paid_at, status, customers(name, email), tenants:tenant_id(name)")
    .in("status", ["pending", "due", "overdue"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let statusUpdated = 0;
  let remindersSent = 0;
  let emailsSent = 0;

  for (const inst of installments ?? []) {
    const row = inst as any;

    // 1) Durum geçişi
    const next = deriveStatus({ due_date: row.due_date, paid_at: row.paid_at, status: row.status }, now);
    if (next !== row.status) {
      await supabase.from("installments").update({ status: next, updated_at: now.toISOString() }).eq("id", row.id);
      statusUpdated++;
    }

    // 2) Hatırlatma kararı
    const kind = reminderFor({ due_date: row.due_date, paid_at: row.paid_at, status: next }, now);
    if (!kind) continue;

    // Deduplike: aynı taksit+tür için tekrar gönderme (UNIQUE installment_id, kind)
    const { error: insErr } = await supabase
      .from("installment_reminders")
      .insert({ tenant_id: row.tenant_id, installment_id: row.id, kind, channel: "email" });

    // UNIQUE ihlali => bu hatırlatma zaten gönderilmiş, atla.
    if (insErr) continue;
    remindersSent++;

    // E-posta gönder (Resend env yoksa lib/email no-op yapar).
    const customer = (Array.isArray(row.customers) ? row.customers[0] : row.customers) as { name: string; email: string | null } | null;
    const tenant = (Array.isArray(row.tenants) ? row.tenants[0] : row.tenants) as { name: string } | null;
    if (customer?.email) {
      const amountStr = `₺${Number(row.amount || 0).toLocaleString("tr-TR")}`;
      const dueStr = new Date(row.due_date + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
      const mail = installmentReminderEmail(customer.name, tenant?.name ?? "İşletmeniz", amountStr, dueStr, kind);
      try {
        await sendEmail({ to: customer.email, ...mail });
        emailsSent++;
      } catch (e) {
        console.error("Taksit hatırlatma e-postası gönderilemedi:", e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    total: (installments ?? []).length,
    statusUpdated,
    remindersSent,
    emailsSent,
    // Stripe tekrarlı tahsilat: anahtar geldiğinde etkinleşecek.
    stripeChargingEnabled: false,
  });
}
