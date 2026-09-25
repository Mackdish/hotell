# Supabase setup

This folder contains versioned database migrations for the Plate ordering app.

## Configure the app

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project. The publishable/anon key is intended for browser use with RLS enabled.
3. Install dependencies with `npm install`.
4. In Supabase Authentication, configure the allowed site URL and redirect URLs for local and deployed environments.
5. Start the app with `npm run dev` and open `/login` to sign in or create a customer account.

## Apply database migrations

1. Install the Supabase CLI and authenticate: `supabase login`.
2. Link the repository: `supabase link --project-ref YOUR_PROJECT_REF`.
3. Apply migrations: `supabase db push`.

Alternatively, run the SQL files in `migrations/` in timestamp order using the Supabase SQL Editor.

## What the migrations create

- Profiles linked to Supabase Auth, with customer/kitchen/admin/cashier roles.
- Menu items and pickup locations, seeded with the current starter catalogue.
- Pickup slots with capacity fields.
- Orders and order items, including scheduled pickup date/time.
- Payment records for M-Pesa, Airtel Money, cash, and card.
- App settings including the 09:00 Africa/Nairobi cutoff.
- Row-level security policies, profile-on-signup trigger, and profile updated-at timestamp trigger.

## Important security notes

- Phase 3 adds the Supabase browser client and sign-in/sign-up screen. The existing customer menu, checkout, and admin dashboard are still prototype/localStorage-based; they are not yet connected to shared Supabase data.
- Customer order creation and payment writes are intentionally not granted as direct table writes. Implement them through a trusted server-side route or database function that validates menu prices, stock, the 09:00 cutoff, pickup slot capacity, and payment status.
- Never put the Supabase service-role key in a `NEXT_PUBLIC_*` variable or browser code.
- New accounts receive the `customer` role. Assign staff roles only through a trusted administrator process; do not let users set their own role.


## Phase 4: live menu and order flow

- The homepage and menu page read active menu rows from `public.menu_items`, with the local starter menu retained as a development fallback when Supabase is not configured or the query fails.
- Checkout requires a signed-in Supabase user and submits to `POST /api/orders`.
- The API verifies the user's bearer token and calls `public.create_customer_order`, which calculates prices from database rows, validates pickup scheduling/payment selection, and writes the order and line items atomically.
- `GET /api/orders` returns only the signed-in customer's order history. Row Level Security remains enabled.
- Apply the new `20260925000300_secure_order_creation.sql` migration before using live ordering.

Inventory quantities are checked when present but are not decremented/reserved by this phase. M-Pesa initiation/callback handling and staff order-status management remain future work. The browser basket is still stored locally.
