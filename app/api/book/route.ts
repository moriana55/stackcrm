import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// ── Doğrulama yardımcıları (fail-closed) ───────────────────────────────────
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: unknown, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}

export async function POST(req: Request) {
  try {
    // 1. Hız sınırı: IP başına 60 sn'de en fazla 5 rezervasyon denemesi.
    const ip = clientIp(req);
    const rl = rateLimit(`book:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const tenant_id = clean(body.tenant_id, 64);
    const service_id = clean(body.service_id, 64);
    const member_id_raw = clean(body.member_id, 64);
    const customer_name = clean(body.customer_name, 120);
    const customer_phone = clean(body.customer_phone, 40);
    const customer_email = clean(body.customer_email, 160).toLowerCase();
    const booking_date = clean(body.booking_date, 10);
    const start_time = clean(body.start_time, 5);
    const end_time = clean(body.end_time, 5);
    const notes = clean(body.notes, 500) || null;

    // 2. Şema doğrulaması (fail-closed)
    if (
      !UUID_RE.test(tenant_id) ||
      !UUID_RE.test(service_id) ||
      !customer_name ||
      !DATE_RE.test(booking_date) ||
      !TIME_RE.test(start_time) ||
      !TIME_RE.test(end_time) ||
      start_time >= end_time
    ) {
      return NextResponse.json({ error: "Eksik veya geçersiz alanlar." }, { status: 400 });
    }
    if (customer_email && !EMAIL_RE.test(customer_email)) {
      return NextResponse.json({ error: "Geçersiz e-posta." }, { status: 400 });
    }
    if (!customer_phone && !customer_email) {
      return NextResponse.json({ error: "Telefon veya e-posta gereklidir." }, { status: 400 });
    }
    // Geçmiş tarihe rezervasyon engeli
    const today = new Date().toISOString().slice(0, 10);
    if (booking_date < today) {
      return NextResponse.json({ error: "Geçmiş bir tarih seçilemez." }, { status: 400 });
    }

    const member_id = member_id_raw && UUID_RE.test(member_id_raw) ? member_id_raw : null;
    const supabase = await createClient();

    // 3. Tenant + servis gerçekten var mı? (uydurma id ile yazımı engelle)
    const { data: svc } = await supabase
      .from("services")
      .select("id, price, duration")
      .eq("id", service_id)
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!svc) {
      return NextResponse.json({ error: "Hizmet bulunamadı." }, { status: 404 });
    }
    // Fiyat istemciden DEĞİL, sunucudaki servis kaydından alınır.
    const amount = Number(svc.price ?? 0);

    // 4. Çakışma kontrolü: aynı personel + tarih + saatte zaten kayıt var mı?
    if (member_id) {
      const { data: clash } = await supabase
        .from("bookings")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("member_id", member_id)
        .eq("booking_date", booking_date)
        .lt("start_time", end_time)
        .gt("end_time", start_time)
        .not("status", "in", "(cancelled,no_show)")
        .limit(1);

      if (clash && clash.length > 0) {
        return NextResponse.json(
          { error: "Bu saat artık müsait değil. Lütfen başka bir saat seçin." },
          { status: 409 }
        );
      }
    }

    // 5. Müşteri profilini en iyi çabayla eşle/oluştur (RLS engellerse yok say)
    let customerId: string | null = null;
    try {
      if (customer_email || customer_phone) {
        let q = supabase.from("customers").select("id").eq("tenant_id", tenant_id);
        q = customer_email ? q.eq("email", customer_email) : q.eq("phone", customer_phone);
        const { data: existing } = await q.maybeSingle();
        if (existing) {
          customerId = existing.id;
        } else {
          const { data: created } = await supabase
            .from("customers")
            .insert({ tenant_id, name: customer_name, phone: customer_phone || null, email: customer_email || null, status: "new" })
            .select("id")
            .maybeSingle();
          if (created) customerId = created.id;
        }
      }
    } catch (e) {
      console.warn("Müşteri profili eşlenemedi:", e);
    }

    // 6. ONAY BEKLEYEN (pending) rezervasyon yaz — salon kabul edince confirmed olur.
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        tenant_id,
        customer_id: customerId,
        member_id,
        service_id,
        customer_name,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        booking_date,
        start_time,
        end_time,
        notes,
        amount,
        status: "pending",
        source: "online",
      })
      .select("id, status, booking_date, start_time")
      .single();

    if (error) {
      console.error("Rezervasyon yazılamadı:", error.message);
      return NextResponse.json({ error: "Rezervasyon oluşturulamadı." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, booking });
  } catch (err) {
    console.error("Beklenmeyen rezervasyon hatası:", err);
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
