import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, appointmentReminderEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, customers(name, email, phone), tenants:tenant_id(name)")
    .gte("appointment_date", tomorrowStart.toISOString())
    .lte("appointment_date", tomorrowEnd.toISOString())
    .in("status", ["pending", "confirmed"]);

  let sent = 0;

  for (const apt of appointments ?? []) {
    const customer = (Array.isArray(apt.customers) ? apt.customers[0] : apt.customers) as { name: string; email: string | null } | null;
    const tenant = (Array.isArray(apt.tenants) ? apt.tenants[0] : apt.tenants) as { name: string } | null;

    if (!customer?.email) continue;

    const dt = new Date(apt.appointment_date);
    const dateStr = dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const email = appointmentReminderEmail(customer.name, tenant?.name ?? "Our Shop", dateStr, timeStr);
    await sendEmail({ to: customer.email, ...email });
    sent++;
  }

  return NextResponse.json({ sent, total: (appointments ?? []).length });
}
