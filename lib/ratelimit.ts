// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Basit, bağımlılıksız hız sınırlayıcı (in-memory, sliding window).         ║
// ║  Public uçlar (ör. online rezervasyon) için kötüye kullanımı yavaşlatır.   ║
// ║  NOT: Tek process içinde çalışır; çok-instance dağıtımda Upstash/Redis     ║
// ║  gibi paylaşımlı bir store önerilir (env'e bağlı, sonraya bırakıldı).      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Bellek sızıntısını önlemek için süresi dolmuş kovaları periyodik temizle.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfter: number };

export function rateLimit(key: string, limit = 5, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const hit = buckets.get(key);

  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (hit.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  }

  hit.count += 1;
  return { allowed: true, remaining: limit - hit.count, retryAfter: 0 };
}

// İstekten istemci IP'sini en iyi çabayla çıkarır (proxy başlıkları dahil).
export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}
