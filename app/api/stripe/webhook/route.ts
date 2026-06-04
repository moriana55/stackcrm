import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { PackId } from "@/config/modules";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const tenantId = session.metadata?.tenant_id;
    const packs = JSON.parse(session.metadata?.packs || '["base"]') as PackId[];

    if (tenantId) {
      await supabase.from("tenants").update({
        packs,
        plan: packs.length > 1 ? "starter" : "free",
        settings: {
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        },
        updated_at: new Date().toISOString(),
      }).eq("id", tenantId);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer as string;

    const { data: tenants } = await supabase
      .from("tenants")
      .select("id")
      .contains("settings", { stripe_customer_id: customerId });

    if (tenants && tenants.length > 0) {
      await supabase.from("tenants").update({
        packs: ["base"],
        plan: "free",
        updated_at: new Date().toISOString(),
      }).eq("id", tenants[0].id);
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    if (subscription.status === "past_due" || subscription.status === "unpaid") {
      const customerId = subscription.customer as string;
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id")
        .contains("settings", { stripe_customer_id: customerId });

      if (tenants && tenants.length > 0) {
        await supabase.from("tenants").update({
          plan: "free",
          updated_at: new Date().toISOString(),
        }).eq("id", tenants[0].id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
