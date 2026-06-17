"use client";

import Link from "next/link";
import { useState } from "react";
import { trackFunnelEvent } from "@/lib/funnel";

type Props = {
  daysLeft: number | null;
  expired: boolean;
};

// Deneme/ücretsiz kullanıcılar için yükseltme çağrısı (CTA). Tıklama olayını izler.
export default function UpgradeCta({ daysLeft, expired }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className={`mb-6 rounded-2xl border p-4 flex items-center justify-between gap-4 ${
        expired
          ? "bg-red-50 border-red-200"
          : "bg-gradient-to-r from-rose-50 to-amber-50 border-rose-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-rose-500">
          {expired ? "lock_clock" : "rocket_launch"}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {expired
              ? "Deneme süreniz doldu"
              : daysLeft !== null
                ? `Deneme sürenizde ${daysLeft} gün kaldı`
                : "Daha fazlasını açın"}
          </p>
          <p className="text-xs text-gray-600">
            Satış, finans ve envanter modüllerini etkinleştirmek için planınızı yükseltin.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/settings"
          onClick={() => {
            void trackFunnelEvent("upgrade_cta_clicked", { expired, daysLeft });
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-outlined text-base">upgrade</span>
          Planı Yükselt
        </Link>
        {!expired && (
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>
    </div>
  );
}
