import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getUserClient(request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
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

function normalizeKenyanPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return "254" + digits.slice(1);
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return null;
}

export async function POST(request) {
  const userSetup = getUserClient(request);
  if (userSetup.error) return NextResponse.json({ error: userSetup.error }, { status: userSetup.status });

  const { data: { user }, error: authError } = await userSetup.supabase.auth.getUser(userSetup.token);
  if (authError || !user) return NextResponse.json({ error: "Your session is invalid. Sign in again." }, { status: 401 });

  const publicKey = process.env.PAYZA_PUBLIC_KEY;
  const secretKey = process.env.PAYZA_SECRET_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!publicKey || !secretKey || !serviceKey || !siteUrl) {
    return NextResponse.json({ error: "PayzaAPI or server configuration is missing. Contact the administrator." }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber || "").trim();
  const phone = normalizeKenyanPhone(body.phone);
  if (!orderNumber || !phone) {
    return NextResponse.json({ error: "Enter a valid Kenyan phone number and order reference." }, { status: 400 });
  }

  const { data: order, error: orderError } = await userSetup.supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, total, payment_method, payment_status, status")
    .eq("order_number", orderNumber)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (orderError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.payment_method !== "mpesa" || order.payment_status !== "pending" || order.status !== "pending_payment") {
    return NextResponse.json({ error: "This order is not awaiting PayzaAPI payment." }, { status: 409 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, status, provider_checkout_id")
    .eq("order_id", order.id)
    .maybeSingle();

  if (paymentError || !payment) return NextResponse.json({ error: "Payment record was not found." }, { status: 500 });
  if (payment.provider_checkout_id) {
    return NextResponse.json({ error: "A payment attempt already exists for this order. Check payment status before retrying." }, { status: 409 });
  }

  const base = siteUrl.replace(/\/$/, "");
  let callbackUrl;
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("HTTPS required");
    callbackUrl = `${base}/api/webhooks/payza`;
  } catch {
    return NextResponse.json({ error: "APP_BASE_URL must be a valid HTTPS URL." }, { status: 503 });
  }

  const reference = order.order_number;
  const payzaResponse = await fetch("https://payzaapi.co.ke/api/v1/pay", {
    method: "POST",
    headers: {
      "X-Public-Key": publicKey,
      "X-Secret-Key": secretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Number(order.total),
      currency: "KES",
      reference,
      customer: {
        email: user.email || "customer@example.com",
        name: order.customer_name || user.email || "Customer",
        phone,
      },
      callback_url: callbackUrl,
      description: `Food order ${reference}`,
      metadata: { order_id: order.id, order_number: order.order_number, customer_id: user.id },
    }),
    cache: "no-store",
  });

  let payza;
  try { payza = await payzaResponse.json(); } catch {
    return NextResponse.json({ error: "PayzaAPI returned an unreadable response." }, { status: 502 });
  }
  if (!payzaResponse.ok || !payza?.success || !payza?.data?.reference) {
    return NextResponse.json({ error: payza?.message || "PayzaAPI could not start the payment." }, { status: 502 });
  }

  const { error: updateError } = await admin.from("payments").update({
    provider_checkout_id: payza.data.reference,
    status: "initiated",
    phone_number: phone,
    updated_at: new Date().toISOString(),
  }).eq("id", payment.id).is("provider_checkout_id", null);

  if (updateError) {
    return NextResponse.json({ error: "Payment was started but could not be linked to the order. Contact support before retrying." }, { status: 500 });
  }

  return NextResponse.json({
    reference: payza.data.reference,
    status: payza.data.status || "pending",
    stkSent: payza.data.stk_sent ?? null,
    paymentUrl: payza.data.payment_url || null,
    expiresAt: payza.data.expires_at || null,
    message: payza.message || "Payment request sent.",
  }, { status: 200 });
}
