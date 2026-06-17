import type { Tenant } from "@/lib/tenant";

export type TrialStatus = {
  isPaid: boolean;
  isTrial: boolean;
  daysLeft: number | null;
  expired: boolean;
};

// Tenant verisinden deneme/ödeme durumunu türetir (DB yazımı yok, saf hesap).
export function getTrialStatus(
  tenant: Pick<Tenant, "packs" | "plan" | "trial_ends_at" | "converted_at">
): TrialStatus {
  const paidPacks = (tenant.packs ?? []).filter((p) => p !== "base");
  const isPaid = paidPacks.length > 0 || tenant.plan !== "free" || !!tenant.converted_at;

  if (isPaid) {
    return { isPaid: true, isTrial: false, daysLeft: null, expired: false };
  }

  if (!tenant.trial_ends_at) {
    return { isPaid: false, isTrial: false, daysLeft: null, expired: false };
  }

  const ends = new Date(tenant.trial_ends_at).getTime();
  const now = Date.now();
  const daysLeft = Math.ceil((ends - now) / (1000 * 60 * 60 * 24));
  return {
    isPaid: false,
    isTrial: true,
    daysLeft: Math.max(0, daysLeft),
    expired: daysLeft <= 0,
  };
}
