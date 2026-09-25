# Supabase setup

This folder contains versioned database migrations for the Plate ordering app.

## Apply the Phase 2 schema

1. Create a Supabase project.
2. Install the Supabase CLI and authenticate:
   `supabase login`
3. Link this repository to the project:
   `supabase link --project-ref YOUR_PROJECT_REF`
4. Apply migrations:
   `supabase db push`

Alternatively, copy `migrations/20260925000100_initial_ordering_schema.sql` into the Supabase SQL Editor and run it.

## What the migration creates

- Profiles linked to Supabase Auth, with customer/kitchen/admin/cashier roles.
- Menu items and pickup locations, seeded with the current starter catalogue.
- Pickup slots with capacity fields.
- Orders and order items, including scheduled pickup date/time.
- Payment records for M-Pesa, Airtel Money, cash, and card.
- App settings including the 09:00 Africa/Nairobi cutoff.
- Row-level security policies and a profile-on-signup trigger.

## Important security notes

- The current checkout is still a browser-storage prototype; this migration does not connect the UI to Supabase.
- Customer order creation and payment writes are intentionally not granted as direct table writes. Implement them through a trusted server-side route or database function that validates menu prices, stock, the 09:00 cutoff, pickup slot capacity, and payment status.
- Never put the Supabase service-role key in a `NEXT_PUBLIC_*` variable or browser code.
- New accounts receive the `customer` role. Assign staff roles only through a trusted administrator process; do not let users set their own role.
