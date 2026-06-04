"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PRESETS } from "@/config/presets";
import { PACKS, ALL_PACK_IDS, calculateMonthlyPrice, type PackId } from "@/config/modules";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [shopName, setShopName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedPacks, setSelectedPacks] = useState<PackId[]>(["base"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  function selectPreset(presetId: string) {
    setSelectedPreset(presetId);
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset && presetId !== "custom") {
      setSelectedPacks(preset.packs);
    }
  }

  function togglePack(packId: PackId) {
    if (packId === "base") return;
    setSelectedPacks((prev) =>
      prev.includes(packId) ? prev.filter((p) => p !== packId) : [...prev, packId]
    );
    setSelectedPreset("custom");
  }

  async function handleCreate() {
    if (!shopName.trim()) { setError("Please enter your shop name"); return; }
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const { data: tenant, error: err } = await supabase.from("tenants").insert({
        name: shopName.trim(),
        slug: slug || `shop-${Date.now()}`,
        owner_id: user.id,
        packs: selectedPacks,
        plan: selectedPacks.length <= 1 ? "free" : "starter",
      }).select().single();

      if (err) throw err;

      await supabase.from("tenant_members").insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: "owner",
      });

      router.push("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bridal<span className="text-rose-500">Stack</span>
          </h1>
          <p className="text-gray-500 mt-2">Let&apos;s set up your shop</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-8 bg-gray-900" : s < step ? "w-8 bg-gray-400" : "w-8 bg-gray-200"}`} />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">What&apos;s your shop called?</h2>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none text-lg"
                placeholder="e.g. Grace Bridal Boutique"
                autoFocus
              />
              <button
                onClick={() => shopName.trim() ? setStep(2) : setError("Please enter a name")}
                className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose a template</h2>
              <p className="text-sm text-gray-500 mb-6">Pick the closest match — you can customize later.</p>
              <div className="grid grid-cols-2 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPreset === preset.id ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl text-gray-600 mb-2 block">{preset.icon}</span>
                    <div className="font-medium text-gray-900 text-sm">{preset.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{preset.description}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">Back</button>
                <button onClick={() => selectedPreset ? setStep(3) : setError("Pick a template")} className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Customize your modules</h2>
              <p className="text-sm text-gray-500 mb-6">
                Toggle the packs you need. Total: <strong>${calculateMonthlyPrice(selectedPacks)}/mo</strong>
              </p>
              <div className="grid gap-3">
                {ALL_PACK_IDS.map((packId) => {
                  const pack = PACKS[packId];
                  const active = selectedPacks.includes(packId);
                  return (
                    <button
                      key={packId}
                      onClick={() => togglePack(packId)}
                      disabled={packId === "base"}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                        active ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-300"
                      } ${packId === "base" ? "opacity-75" : ""}`}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{pack.name}</div>
                        <div className="text-xs text-gray-500">{pack.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {pack.monthlyPrice === 0 ? "Free" : `$${pack.monthlyPrice}/mo`}
                        </div>
                        {active && <span className="text-xs text-green-600">✓ Active</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">Back</button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Launch My Shop"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
