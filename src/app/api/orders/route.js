import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabaseForRequest(request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token) return { error: "Sign in to continue.", status: 401 };
  if (!url || !key) return { error: "Supabase is not configured.", status: 503 };

  return {
    token,
    supabase: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }),
  };
}

export async function GET(request) {
  const setup = getSupabaseForRequest(request);
  if (setup.error) return NextResponse.json({ error: setup.error }, { status: setup.status });

  const { data: { user }, error: authError } = await setup.supabase.auth.getUser(setup.token);
  if (authError || !user) return NextResponse.json({ error: "Your session is invalid. Please sign in again." }, { status: 401 });

  const { data, error } = await setup.supabase
    .from("orders")
    .select("id, order_number, pickup_date, pickup_time, pickup_datetime, status, payment_method, payment_status, subtotal, total, notes, created_at, preparing_at, ready_at, collected_at, pickup_locations(name), order_items(item_name, unit_price, quantity, line_total)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orders: data });
}

export async function POST(request) {
  const setup = getSupabaseForRequest(request);
  if (setup.error) return NextResponse.json({ error: setup.error }, { status: setup.status });

  const { data: { user }, error: authError } = await setup.supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Your session is invalid. Please sign in again." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    return NextResponse.json({ error: "Add between 1 and 30 distinct menu items." }, { status: 400 });
  }

  const items = body.items.map((item) => ({
    name: typeof item?.name === "string" ? item.name.trim() : "",
    quantity: Number(item?.quantity),
  }));

  if (items.some((item) => !item.name || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) {
    return NextResponse.json({ error: "Each item needs a name and a quantity between 1 and 50." }, { status: 400 });
  }

  const { data, error } = await setup.supabase.rpc("create_customer_order", {
    p_items: items,
    p_pickup_location: body.pickupLocation,
    p_payment_method: body.paymentMethod,
    p_pickup_date: body.pickupDate,
    p_pickup_time: body.pickupTime,
    p_notes: typeof body.notes === "string" ? body.notes.slice(0, 1000) : "",
  });

  if (error) {
    const status = /sign in|pickup|available|date|time|cutoff|payment|menu|quantity/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ order: data }, { status: 201 });
}
