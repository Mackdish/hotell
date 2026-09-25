import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isValidSignature(rawBody, received, secret) {
  if (!received || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let actual;
  try { actual = Buffer.from(received, "hex"); } catch { return false; }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request) {
  const webhookSecret = process.env.PAYZA_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Webhook endpoint is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-payza-signature") || "";
  if (!isValidSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!["payment.success", "payment.failed", "payment.cancelled"].includes(event.event)) {
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }
  if (!event.reference || !Number.isFinite(Number(event.amount)) || event.currency !== "KES") {
    return NextResponse.json({ error: "Webhook is missing required payment details." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("apply_payza_payment_event", {
    p_reference: String(event.reference),
    p_event: String(event.event),
    p_status: String(event.status || ""),
    p_amount: Number(event.amount),
    p_currency: String(event.currency),
    p_provider_transaction_id: event.transaction_id ? String(event.transaction_id) : null,
    p_payload: event,
  });

  if (error) {
    console.error("Payza webhook processing failed:", error.message);
    return NextResponse.json({ error: "Unable to apply payment event." }, { status: 500 });
  }
  return NextResponse.json({ received: true, result: data }, { status: 200 });
}
