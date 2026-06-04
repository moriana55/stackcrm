import { createClient } from "@/lib/supabase/server";
import { ModuleId, PackId, getModulesForPacks } from "@/config/modules";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  packs: PackId[];
  enabled_modules: ModuleId[];
  settings: Record<string, unknown>;
  plan: "free" | "starter" | "growth" | "enterprise";
  created_at: string;
};

export async function getCurrentTenant(): Promise<Tenant | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", membership.tenant_id)
    .single();

  if (!tenant) return null;

  const packs = (tenant.packs ?? ["base"]) as PackId[];
  const enabledModules = getModulesForPacks(packs);

  return {
    ...tenant,
    packs,
    enabled_modules: enabledModules,
    settings: tenant.settings ?? {},
  } as Tenant;
}

export async function getTenantModules(): Promise<ModuleId[]> {
  const tenant = await getCurrentTenant();
  if (!tenant) return ["crm", "appointments"];
  return tenant.enabled_modules;
}
