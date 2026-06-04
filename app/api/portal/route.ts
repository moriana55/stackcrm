import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { customer_id } = await req.json();
  if (!customer_id) return NextResponse.json({ error: "customer_id required" }, { status: 400 });

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const { error } = await supabase.from("portal_tokens").insert({
    tenant_id: tenant.id,
    customer_id,
    token,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const url = `${req.nextUrl.origin}/portal/${token}`;
  return NextResponse.json({ url, token });
}
