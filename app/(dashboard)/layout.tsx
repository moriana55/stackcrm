import { getCurrentTenant } from "@/lib/tenant";
import { getTrialStatus } from "@/lib/funnel-utils";
import { getNavForModules, type ModuleId } from "@/config/modules";
import Sidebar from "@/components/sidebar";
import UpgradeCta from "@/components/upgrade-cta";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenantData = await getCurrentTenant();
  const tenant = tenantData ?? { name: "Demo", enabled_modules: [] as ModuleId[] };
  const navGroups = getNavForModules(tenant.enabled_modules);

  // Trial → paid funnel: ücretsiz/deneme tenant'larına yükseltme CTA'sı göster
  const trial = tenantData ? getTrialStatus(tenantData) : null;
  const showCta = !!trial && !trial.isPaid;

  return (
    <div className="min-h-screen">
      <Sidebar groups={navGroups} tenantName={tenant.name} />
      <main className="lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 bs-animate-in">
          {showCta && trial && (
            <UpgradeCta daysLeft={trial.daysLeft} expired={trial.expired} />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
