import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenant_id,
      service_id,
      member_id,
      customer_name,
      customer_phone,
      customer_email,
      booking_date,
      start_time,
      end_time,
      notes,
      amount,
    } = body;

    if (!tenant_id || !service_id || !customer_name || !booking_date || !start_time || !end_time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Try to find or associate a customer profile (best effort)
    let customerId = null;
    try {
      if (customer_email || customer_phone) {
        let query = supabase.from("customers").select("id").eq("tenant_id", tenant_id);
        if (customer_email) {
          query = query.eq("email", customer_email);
        } else {
          query = query.eq("phone", customer_phone);
        }
        
        const { data: existingCust } = await query.maybeSingle();
        if (existingCust) {
          customerId = existingCust.id;
        } else {
          // Attempt to create a new customer profile
          const { data: newCust } = await supabase
            .from("customers")
            .insert({
              tenant_id,
              name: customer_name,
              phone: customer_phone || null,
              email: customer_email || null,
              status: "new",
            })
            .select("id")
            .maybeSingle();
          
          if (newCust) {
            customerId = newCust.id;
          }
        }
      }
    } catch (e) {
      // Ignore customer creation/lookup errors (e.g. if RLS blocks guest customer insertion)
      console.warn("Could not associate or create customer profile:", e);
    }

    // 2. Insert booking record
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        tenant_id,
        customer_id: customerId,
        member_id: member_id && member_id !== "No preference" ? member_id : null,
        service_id,
        customer_name,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        booking_date,
        start_time,
        end_time,
        notes: notes || null,
        amount: amount || 0,
        status: "confirmed",
        source: "online",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(booking);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
