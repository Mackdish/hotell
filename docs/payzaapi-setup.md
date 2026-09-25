# Phase 6 — PayzaAPI payment setup

This phase integrates PayzaAPI KES payments for M-Pesa STK Push and signed payment webhooks.

## Required server environment variables

Add these in the server deployment environment (never in client-side code):

- `PAYZA_PUBLIC_KEY`: PayzaAPI public key (`pk_test_...` for testing, `pk_live_...` for live).
- `PAYZA_SECRET_KEY`: PayzaAPI secret key.
- `PAYZA_WEBHOOK_SECRET`: Webhook Signing Secret from PayzaAPI Dashboard → API Keys.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key, server-side only.
- `APP_BASE_URL`: Public HTTPS origin for this app, without a trailing slash (used to build `/api/webhooks/payza`).
- Existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Setup steps

1. Apply the Phase 2, 3, 4, 5, and 6 migrations in order.
2. Add the environment variables above to the hosting provider and restart/redeploy.
3. Set PayzaAPI webhook callback to the generated URL `https://YOUR_DOMAIN/api/webhooks/payza` (the endpoint is sent to PayzaAPI automatically during payment creation).
4. Start with PayzaAPI test keys, create an M-Pesa order using a valid Kenyan phone number, and verify the signed webhook updates the order and payment.
5. Swap to live keys only after end-to-end tests.

## Flow

- Customer places a checkout order with M-Pesa selected. The order remains `pending_payment` until PayzaAPI confirms payment.
- Server starts the PayzaAPI KES payment using the order number as a unique reference.
- Webhook verifies HMAC-SHA256 signature using the raw body, then invokes a service-role-only database function.
- A successful payment marks payment `succeeded` and order `paid/confirmed`.
- A failed/cancelled payment marks the order cancelled and restores tracked inventory once. Duplicate events are idempotent.

## Notes

- This implements the default PayzaAPI M-Pesa STK Push flow. The hosted checkout URL is returned for optional fallback.
- PayzaAPI test mode can simulate success. Do not treat a browser redirect as proof of payment; the signed webhook is authoritative.
- Payment retries require a separate retry-order flow because PayzaAPI references must be unique and an order reference cannot be reused.
