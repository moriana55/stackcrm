import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "No query" }, { status: 400 });

  const [{ data: products }, { data: customers }, { data: tryOns }, { data: orders }] = await Promise.all([
    supabase.from("products").select("name, category, price, cost, stock_quantity, lifecycle_stage").eq("tenant_id", tenant.id).limit(50),
    supabase.from("customers").select("name, status, metadata").eq("tenant_id", tenant.id).limit(50),
    supabase.from("try_ons").select("reaction, rating, notes, products(name, category, price), customers(name)").eq("tenant_id", tenant.id).limit(100),
    supabase.from("orders").select("ref_no, order_type, status, discounted_total, created_at").eq("tenant_id", tenant.id).limit(50),
  ]);

  const context = `
You are an AI Stylist assistant for a bridal shop called "${tenant.name}".
You help shop owners with gown recommendations, sales insights, and customer advice.
Be specific, data-driven, and actionable. Use the shop's actual data below.

INVENTORY (${(products ?? []).length} items):
${(products ?? []).map(p => `- ${p.name} | ${p.category ?? "N/A"} | $${p.price} | Cost $${p.cost} | Stock: ${p.stock_quantity} | ${p.lifecycle_stage}`).join("\n")}

RECENT TRY-ONS (${(tryOns ?? []).length}):
${(tryOns ?? []).map(t => {
  const prod = (Array.isArray(t.products) ? t.products[0] : t.products) as { name: string; price: number } | null;
  const cust = (Array.isArray(t.customers) ? t.customers[0] : t.customers) as { name: string } | null;
  return `- ${cust?.name ?? "?"} tried ${prod?.name ?? "?"} → ${t.reaction ?? "no reaction"} (${t.rating ?? "no rating"}/5) ${t.notes ?? ""}`;
}).join("\n")}

RECENT ORDERS (${(orders ?? []).length}):
${(orders ?? []).map(o => `- ${o.ref_no} | ${o.order_type} | $${o.discounted_total} | ${o.status} | ${new Date(o.created_at).toLocaleDateString()}`).join("\n")}

CUSTOMERS (${(customers ?? []).length}):
${(customers ?? []).map(c => `- ${c.name} | ${c.status}`).join("\n")}
`;

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const lovedGowns = (tryOns ?? []).filter(t => t.reaction === "loved").length;
    const totalRevenue = (orders ?? []).reduce((s, o) => s + Number(o.discounted_total ?? 0), 0);
    return NextResponse.json({
      answer: `Based on your shop data:\n\n📊 ${(products ?? []).length} products in inventory\n👰 ${(customers ?? []).length} customers\n💍 ${(tryOns ?? []).length} try-ons recorded (${lovedGowns} loved)\n💰 $${totalRevenue.toLocaleString()} total revenue from ${(orders ?? []).length} orders\n\n(Connect an AI API key for personalized recommendations — add ANTHROPIC_API_KEY or OPENAI_API_KEY to your environment variables)`,
    });
  }

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: context,
          messages: [{ role: "user", content: query }],
        }),
      });
      const data = await res.json();
      return NextResponse.json({ answer: data.content?.[0]?.text ?? "No response" });
    }

    if (process.env.OPENAI_API_KEY) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: context }, { role: "user", content: query }],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      return NextResponse.json({ answer: data.choices?.[0]?.message?.content ?? "No response" });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ error: "No AI provider configured" }, { status: 500 });
}
