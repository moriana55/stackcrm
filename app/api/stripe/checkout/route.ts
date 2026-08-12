import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { getCurrentTenant } from "@/lib/tenant";
import { PackId, PACKS } from "@/config/modules";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { packs } = (await req.json()) as { packs: PackId[] };
  if (!packs || !Array.isArray(packs)) return NextResponse.json({ error: "Invalid packs" }, { status: 400 });

  const newPacks = packs.filter((p) => p !== "base" && PACKS[p]);
  const lineItems = newPacks
    .map((packId) => {
      const priceId = STRIPE_PRICE_IDS[packId];
      if (!priceId) return null;
      return { price: priceId, quantity: 1 };
    })
    .filter(Boolean) as { price: string; quantity: number }[];

  if (lineItems.length === 0) {
    await supabase.from("tenants").update({ packs: ["base"], plan: "free" }).eq("id", tenant.id);
    return NextResponse.json({ url: "/settings?success=updated" });
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email!,
    mode: "subscription",
    line_items: lineItems,
    success_url: `${req.nextUrl.origin}/settings?success=subscribed`,
    cancel_url: `${req.nextUrl.origin}/settings?cancelled=1`,
    metadata: {
      tenant_id: tenant.id,
      packs: JSON.stringify(["base", ...newPacks]),
    },
  });

  return NextResponse.json({ url: session.url });
}
