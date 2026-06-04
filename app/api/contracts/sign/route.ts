import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { token, signature_data } = await req.json();
  if (!token || !signature_data) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const supabase = await createClient();
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  const { error } = await supabase.from("contracts").update({
    status: "signed",
    signed_at: new Date().toISOString(),
    signature_data,
    ip_address: ip,
  }).eq("token", token).eq("status", "sent");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
