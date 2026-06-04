export type ModuleId =
  | "crm"
  | "appointments"
  | "sales"
  | "invoices"
  | "finance"
  | "inventory"
  | "whatsapp"
  | "reports"
  | "commissions"
  | "efatura";

export type ModuleDefinition = {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  pack: PackId;
  routes: string[];
  navItems: { href: string; label: string; icon: string }[];
  dependencies?: ModuleId[];
};

export type PackId = "base" | "sales" | "finance" | "inventory" | "communication" | "pro";

export type PackDefinition = {
  id: PackId;
  name: string;
  description: string;
  modules: ModuleId[];
  monthlyPrice: number;
  color: string;
};

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  crm: {
    id: "crm",
    name: "Customer Management",
    description: "Customer profiles, notes, status tracking",
    icon: "groups",
    pack: "base",
    routes: ["/customers", "/customers/new", "/customers/[id]"],
    navItems: [
      { href: "/customers", label: "Customers", icon: "groups" },
    ],
  },
  appointments: {
    id: "appointments",
    name: "Appointments & Calendar",
    description: "Scheduling, calendar view, reminders",
    icon: "event",
    pack: "base",
    routes: ["/appointments", "/calendar"],
    navItems: [
      { href: "/appointments", label: "Appointments", icon: "event" },
      { href: "/calendar", label: "Takvim", icon: "calendar_month" },
    ],
  },
  sales: {
    id: "sales",
    name: "Sales & Contracts",
    description: "Sipariş oluşturma, sözleşme, taksit planı",
    icon: "receipt_long",
    pack: "sales",
    routes: ["/orders", "/orders/new", "/orders/[id]"],
    navItems: [
      { href: "/orders", label: "Orders", icon: "receipt_long" },
    ],
    dependencies: ["crm"],
  },
  invoices: {
    id: "invoices",
    name: "Fatura",
    description: "Fatura oluşturma, yazdırma, takip",
    icon: "description",
    pack: "sales",
    routes: ["/invoices", "/invoices/new", "/invoices/[id]"],
    navItems: [
      { href: "/invoices", label: "Invoices", icon: "description" },
    ],
    dependencies: ["sales"],
  },
  reports: {
    id: "reports",
    name: "Reports",
    description: "Sales, customer, performance analytics",
    icon: "analytics",
    pack: "sales",
    routes: ["/reports"],
    navItems: [
      { href: "/reports", label: "Reports", icon: "analytics" },
    ],
    dependencies: ["sales"],
  },
  finance: {
    id: "finance",
    name: "Finance",
    description: "Cash register, installments, ledger, checks",
    icon: "account_balance",
    pack: "finance",
    routes: ["/cash", "/installments", "/ledger", "/checks"],
    navItems: [
      { href: "/cash", label: "Cash", icon: "account_balance" },
      { href: "/installments", label: "Installments", icon: "receipt" },
      { href: "/ledger", label: "Ledger", icon: "account_balance_wallet" },
      { href: "/checks", label: "Checks", icon: "request_quote" },
    ],
    dependencies: ["sales"],
  },
  inventory: {
    id: "inventory",
    name: "Inventory",
    description: "Ürün, stok, tedarikçi, sayım, iade/değişim",
    icon: "checkroom",
    pack: "inventory",
    routes: ["/products", "/products/new", "/products/[id]", "/suppliers", "/inventory-count", "/returns", "/rentals", "/cleaning", "/alterations", "/try-ons"],
    navItems: [
      { href: "/products", label: "Products", icon: "checkroom" },
      { href: "/try-ons", label: "Try-Ons", icon: "favorite" },
      { href: "/suppliers", label: "Suppliers", icon: "local_shipping" },
      { href: "/inventory-count", label: "Stok Sayım", icon: "inventory" },
      { href: "/returns", label: "İade / Değişim", icon: "swap_horiz" },
    ],
  },
  commissions: {
    id: "commissions",
    name: "Commissions & Staff",
    description: "Komisyon hesaplama, personel performansı",
    icon: "payments",
    pack: "pro",
    routes: ["/commissions", "/commissions/rules", "/staff"],
    navItems: [
      { href: "/commissions", label: "Commissions", icon: "payments" },
      { href: "/staff", label: "Personel", icon: "badge" },
    ],
    dependencies: ["sales"],
  },
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp & Mesajlaşma",
    description: "WhatsApp entegrasyonu, inbox, şablonlar",
    icon: "chat",
    pack: "communication",
    routes: ["/inbox", "/whatsapp", "/templates"],
    navItems: [
      { href: "/inbox", label: "Messages", icon: "chat" },
      { href: "/whatsapp", label: "WhatsApp", icon: "phone_in_talk" },
    ],
  },
  efatura: {
    id: "efatura",
    name: "e-Fatura / e-Arşiv",
    description: "NES entegrasyonu, gelen/giden e-fatura, stoğa işleme",
    icon: "receipt_long",
    pack: "pro",
    routes: ["/invoices/efatura"],
    navItems: [
      { href: "/invoices/efatura", label: "e-Fatura", icon: "receipt_long" },
    ],
    dependencies: ["invoices"],
  },
};

export const PACKS: Record<PackId, PackDefinition> = {
  base: {
    id: "base",
    name: "Temel",
    description: "Customer management & appointments",
    modules: ["crm", "appointments"],
    monthlyPrice: 0,
    color: "#6b7280",
  },
  sales: {
    id: "sales",
    name: "Sales",
    description: "Orders, invoices, reports",
    modules: ["sales", "invoices", "reports"],
    monthlyPrice: 500,
    color: "#2563eb",
  },
  finance: {
    id: "finance",
    name: "Finance",
    description: "Cash, taksit, cari hesap, çek/senet",
    modules: ["finance"],
    monthlyPrice: 400,
    color: "#047857",
  },
  inventory: {
    id: "inventory",
    name: "Inventory",
    description: "Stok, tedarikçi, sayım, iade",
    modules: ["inventory"],
    monthlyPrice: 300,
    color: "#7c3aed",
  },
  communication: {
    id: "communication",
    name: "Communication",
    description: "WhatsApp ve mesajlaşma",
    modules: ["whatsapp"],
    monthlyPrice: 200,
    color: "#059669",
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Komisyon, personel, e-fatura",
    modules: ["commissions", "efatura"],
    monthlyPrice: 600,
    color: "#d97706",
  },
};

export const ALL_MODULE_IDS = Object.keys(MODULES) as ModuleId[];
export const ALL_PACK_IDS = Object.keys(PACKS) as PackId[];

export function getModulesForPacks(packIds: PackId[]): ModuleId[] {
  const modules = new Set<ModuleId>();
  for (const packId of packIds) {
    const pack = PACKS[packId];
    if (!pack) continue;
    for (const moduleId of pack.modules) {
      modules.add(moduleId);
      const mod = MODULES[moduleId];
      if (mod.dependencies) {
        for (const dep of mod.dependencies) modules.add(dep);
      }
    }
  }
  return Array.from(modules);
}

export function calculateMonthlyPrice(packIds: PackId[]): number {
  return packIds.reduce((sum, id) => sum + (PACKS[id]?.monthlyPrice ?? 0), 0);
}

export function getNavForModules(enabledModules: ModuleId[]) {
  const groups: { section?: string; items: { href: string; label: string; icon: string }[] }[] = [
    { items: [{ href: "/dashboard", label: "Ana Sayfa", icon: "dashboard" }] },
  ];

  const sectionMap: Record<string, { section: string; moduleIds: ModuleId[] }> = {
    base: { section: "Clients", moduleIds: ["crm", "appointments"] },
    sales: { section: "Sales", moduleIds: ["sales", "invoices", "reports"] },
    finance: { section: "Finance", moduleIds: ["finance"] },
    inventory: { section: "Inventory", moduleIds: ["inventory"] },
    communication: { section: "Communication", moduleIds: ["whatsapp"] },
    pro: { section: "Management", moduleIds: ["commissions", "efatura"] },
  };

  for (const group of Object.values(sectionMap)) {
    const items: { href: string; label: string; icon: string }[] = [];
    for (const moduleId of group.moduleIds) {
      if (!enabledModules.includes(moduleId)) continue;
      items.push(...MODULES[moduleId].navItems);
    }
    if (items.length > 0) {
      groups.push({ section: group.section, items });
    }
  }

  return groups;
}

export function isRouteAllowed(path: string, enabledModules: ModuleId[]): boolean {
  if (path === "/dashboard" || path === "/settings" || path === "/login") return true;

  for (const moduleId of enabledModules) {
    const mod = MODULES[moduleId];
    for (const route of mod.routes) {
      const pattern = route.replace(/\[.*?\]/g, "[^/]+");
      const regex = new RegExp(`^${pattern}(/|$)`);
      if (regex.test(path)) return true;
    }
  }
  return false;
}
