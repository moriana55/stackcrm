"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { section?: string; items: NavItem[] };

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      Bridal<span className="text-[var(--accent)]">Stack</span>
    </span>
  );
}

export default function Sidebar({ groups, tenantName }: { groups: NavGroup[]; tenantName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <>
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg text-gray-900">
            <Wordmark />
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{tenantName}</p>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-700" aria-label="Menüyü kapat">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.section && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {group.section}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--accent-hover)]"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[var(--accent)]" />}
                    <span className={`material-symbols-outlined text-[20px] ${active ? "text-[var(--accent)]" : "text-gray-400 group-hover:text-gray-600"}`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100">
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px] text-gray-400">settings</span>
          Ayarlar
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur border-b border-gray-100 flex items-center justify-between px-4 z-50">
        <button onClick={() => setOpen(true)} className="text-gray-700 -ml-1 p-1" aria-label="Menüyü aç">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h1 className="text-base text-gray-900"><Wordmark /></h1>
        <div className="w-6" />
      </div>

      {/* Mobile overlay */}
      {open && <div className="lg:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 text-gray-900 flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
