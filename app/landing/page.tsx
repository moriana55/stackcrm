import Link from "next/link";
import { PACKS, ALL_PACK_IDS, MODULES } from "@/config/modules";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Bridal<span className="text-rose-500">Stack</span></h1>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
            <Link href="/login" className="text-sm font-medium text-gray-900">Sign In</Link>
            <Link href="/login" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium mb-6">
            <span>✨</span> Built specifically for bridal boutiques
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
            The CRM your bridal<br />shop deserves
          </h1>
          <p className="text-xl text-gray-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            Manage brides, appointments, inventory, sales & payments — all in one beautiful platform. No more spreadsheets.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/login" className="px-8 py-3.5 bg-gray-900 text-white rounded-xl text-base font-medium hover:bg-gray-800 transition-colors">
              Get Started Free →
            </Link>
            <a href="#features" className="px-8 py-3.5 border border-gray-300 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              See Features
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-4">Free plan available · No credit card required</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: "10+", label: "Modules" },
            { value: "5 min", label: "Setup Time" },
            { value: "$0", label: "To Start" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need, nothing you don&apos;t</h2>
            <p className="text-gray-500 mt-3 text-lg">Pick only the modules your shop needs. Add more anytime.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "groups", title: "Customer Management", desc: "Bride profiles, wedding dates, preferences, notes & history" },
              { icon: "event", title: "Appointments", desc: "Schedule fittings, track confirmations, calendar view" },
              { icon: "receipt_long", title: "Sales & Contracts", desc: "Orders, installment plans, deposits, delivery tracking" },
              { icon: "checkroom", title: "Inventory", desc: "Gowns, veils, accessories — barcode scanning, stock counts" },
              { icon: "account_balance", title: "Finance", desc: "Cash register, installments, ledger, checks & payments" },
              { icon: "chat", title: "WhatsApp", desc: "Automated reminders, appointment confirmations, payment alerts" },
              { icon: "analytics", title: "Reports", desc: "Revenue, staff performance, category breakdown, targets" },
              { icon: "payments", title: "Commissions", desc: "Staff sales tracking, automatic commission calculation" },
              { icon: "description", title: "Invoicing", desc: "Professional invoices, e-invoice integration, PDF export" },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                <span className="material-symbols-outlined text-2xl text-rose-500 mb-3 block">{f.icon}</span>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Simple, modular pricing</h2>
            <p className="text-gray-500 mt-3 text-lg">Start free. Add modules as you grow.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {ALL_PACK_IDS.map((packId) => {
              const pack = PACKS[packId];
              return (
                <div key={packId} className={`bg-white rounded-2xl border-2 p-6 ${packId === "sales" ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"}`}>
                  {packId === "sales" && <div className="text-xs font-semibold text-rose-500 mb-2">MOST POPULAR</div>}
                  <h3 className="text-lg font-bold text-gray-900">{pack.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-4">{pack.description}</p>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">${pack.monthlyPrice}</span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {pack.modules.map((moduleId) => (
                      <li key={moduleId} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-green-500">✓</span>
                        {MODULES[moduleId]?.name}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`block text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      packId === "sales"
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pack.monthlyPrice === 0 ? "Start Free" : "Get Started"}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900">Ready to modernize your bridal shop?</h2>
          <p className="text-gray-500 mt-3 text-lg">Join hundreds of bridal boutiques using BridalStack.</p>
          <Link href="/login" className="inline-block mt-8 px-8 py-3.5 bg-gray-900 text-white rounded-xl text-base font-medium hover:bg-gray-800 transition-colors">
            Start Free Today →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} BridalStack. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Privacy</a>
            <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Terms</a>
            <a href="mailto:support@bridalstack.com" className="text-sm text-gray-400 hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
