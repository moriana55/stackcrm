# Owner — Elle Yapılması Gerekenler (Deferred)

Aşağıdaki adımlar **kod ile değil**, sahip tarafından anahtar/bağlantı kurularak
tamamlanmalıdır. Kod tarafı hazır ve env-gated; anahtar bağlanınca devreye girer.

## 1. RLS + RBAC + Funnel migration'ını canlı DB'ye uygula (ZORUNLU)
Supabase SQL Editor'de sırayla çalıştırın (idempotent, tekrar çalıştırılabilir):

```
scripts/setup.sql                  # (zaten kurulu olabilir)
scripts/add-salon.sql              # (zaten kurulu olabilir)
scripts/add-tryon-portal.sql       # (zaten kurulu olabilir)
scripts/add-contracts-workflows.sql# (zaten kurulu olabilir)
scripts/2026-rls-hardening.sql     # YENİ — bunu mutlaka uygulayın
```

`2026-rls-hardening.sql` neyi ekler:
- Tüm tenant tablolarına **WITH CHECK**'li RLS politikaları (yazma izolasyonu — workspace_id
  bazlı). Önceki politikalar yalnızca `USING` içeriyordu; INSERT/UPDATE ile başka tenant'a
  yazma açığı vardı. Bu migration o açığı kapatır (fail-closed).
- `user_tenant_ids()` SECURITY DEFINER yardımcı fonksiyonu (RLS özyinelemesini önler).
- RBAC: `tenant_members.role` kısıtı `owner/admin/stylist/viewer` olarak güncellenir;
  eski `member` kayıtları `stylist`'e taşınır.
- Trial→paid cohort alanları: `trial_started_at`, `trial_ends_at`, `converted_at`,
  `signup_source`, `cohort_month`, `onboarding_completed_at`.
- `onboarding_drafts` tablosu (taslak kaydetme).
- `funnel_events` tablosu (CTA/cohort analitiği).

## 2. Stripe (canlı ödeme) — env anahtarları
Kod hazır; aşağıdaki env değişkenleri ayarlanınca checkout/portal/webhook çalışır:
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SALES=
STRIPE_PRICE_FINANCE=
STRIPE_PRICE_INVENTORY=
STRIPE_PRICE_COMMUNICATION=
STRIPE_PRICE_PRO=
```
Anahtar yokken `lib/stripe.ts` null döner ve ödeme akışı devre dışı kalır (uygulama yine
çalışır). Trial→paid funnel CTA'ları anahtar olmadan da görünür; yalnızca gerçek checkout
adımı Stripe env'ine bağlıdır.

## 3. Resend (e-posta) — env anahtarı
```
RESEND_API_KEY=
```
Yoksa e-posta gönderimi atlanır.

## 4. Ekip daveti (gerçek e-posta eşlemesi)
`app/(dashboard)/staff/actions.ts > addMember` şu an daveti yer tutucu olarak işaretler.
Gerçek davet için Supabase Admin API (service role anahtarı) ile e-posta→user_id eşlemesi
gerekir. Service role anahtarı bağlanınca bu fonksiyon genişletilebilir. **Asla** service
role anahtarını client'a sızdırmayın.

## 5. YENİ — Analitik + Online Rezervasyon + Taksit Otomasyonu migration'ı (ZORUNLU)
`2026-rls-hardening.sql` UYGULANDIKTAN SONRA çalıştırın (idempotent):
```
scripts/2026-analytics-booking-installments.sql
```
Neyi ekler:
- `bookings.status` CHECK kısıtına **`pending`** değerini ekler. Public rezervasyon sayfası
  artık ONAY BEKLEYEN (pending) kayıt yazar; salon "Bookings" ekranından onaylar.
- **`installments`** ve **`installment_reminders`** tabloları (taksit planı + hatırlatma
  otomasyonu) — tenant-scoped RLS (USING + WITH CHECK, `user_tenant_ids()` ile) ve indexler.

> NOT: Bu dosya `user_tenant_ids()` fonksiyonuna bağımlıdır; bu yüzden önce
> `2026-rls-hardening.sql` çalıştırılmalıdır.

## 6. YENİ — Taksit cron'u + service-role anahtarı (env)
Taksit otomasyonu cron'u (`/api/cron/installments`) RLS'i baypas etmek için service-role
anahtarı ister. Anahtar yokken cron **fail-closed** çalışır (503 döner, hiçbir şey yapmaz):
```
CRON_SECRET=                     # cron uçlarını korur (Bearer ile çağrılır)
SUPABASE_SERVICE_ROLE_KEY=       # YALNIZCA sunucu; ASLA client'a sızdırmayın
```
Zamanlama önerisi (Vercel Cron veya harici scheduler), günde 1 kez:
```
GET /api/cron/installments
Authorization: Bearer <CRON_SECRET>
```
Cron şu an: ödenmemiş taksitlerin durumunu (pending→due→overdue) günceller ve vade
penceresine göre **hatırlatma e-postası** kuyruğa alır (deduplike). 

**Stripe tekrarlı tahsilat (deferred):** gerçek otomatik kart çekimi mevcut Stripe env'ine
(`STRIPE_SECRET_KEY` vb.) bağlı olarak SONRAYA bırakıldı. Plan + durum + hatırlatma mantığı
koddadır (`lib/installments.ts`); anahtar bağlanınca `stripe_subscription_item_id` alanı ve
çekim adımı eklenebilir. Cron yanıtında `stripeChargingEnabled: false` olarak işaretlidir.
