-- Phase 2: core Supabase schema for scheduled meal ordering.
-- Apply with: supabase db push (or paste into Supabase SQL Editor).
-- Customer order creation/payment writes should go through a trusted server function
-- in a later phase; never expose the service-role key in the browser.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'customer' check (role in ('customer', 'kitchen', 'admin', 'cashier')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default 'Other',
  image_url text,
  price numeric(10,2) not null check (price >= 0),
  is_available boolean not null default true,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  prep_minutes integer not null default 15 check (prep_minutes >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pickup_slots (
  id uuid primary key default gen_random_uuid(),
  pickup_date date not null,
  start_time time not null,
  end_time time not null,
  capacity integer not null default 20 check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pickup_slot_time_order check (end_time > start_time),
  constraint pickup_slot_unique unique (pickup_date, start_time, end_time)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('PLT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  pickup_location_id uuid references public.pickup_locations(id) on delete set null,
  pickup_slot_id uuid references public.pickup_slots(id) on delete set null,
  pickup_date date not null,
  pickup_time time not null,
  pickup_datetime timestamptz generated always as ((pickup_date + pickup_time) at time zone 'Africa/Nairobi') stored,
  status text not null default 'confirmed' check (status in ('pending_payment', 'confirmed', 'preparing', 'ready', 'collected', 'cancelled')),
  payment_method text not null default 'mpesa' check (payment_method in ('mpesa', 'airtel_money', 'cash', 'card')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'pay_on_pickup')),
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  total numeric(10,2) not null default 0 check (total >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  preparing_at timestamptz,
  ready_at timestamptz,
  collected_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('mpesa', 'airtel_money', 'cash', 'card', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'initiated', 'succeeded', 'failed', 'refunded')),
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'KES' check (currency = 'KES'),
  provider_checkout_id text,
  provider_transaction_id text,
  phone_number text,
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_provider_transaction_unique
  on public.payments(provider, provider_transaction_id)
  where provider_transaction_id is not null;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

-- Seed the pickup points already shown in the customer UI.
insert into public.pickup_locations (name, description, sort_order)
select seed.name, seed.description, seed.sort_order
from (values
  ('Main cafeteria counter', 'Ground floor, main building', 1),
  ('Block B pickup point', 'Near lecture halls', 2),
  ('Library café', 'Ground floor, library building', 3)
) as seed(name, description, sort_order)
where not exists (
  select 1 from public.pickup_locations existing where existing.name = seed.name
);

-- Seed the existing starter menu; admins can maintain it from the dashboard in a later phase.
insert into public.menu_items (name, description, category, image_url, price, is_available, prep_minutes, sort_order)
select seed.name, seed.description, seed.category, seed.image_url, seed.price, seed.is_available, seed.prep_minutes, seed.sort_order
from (values
  ('Chicken & coconut rice', 'Grilled chicken, fragrant rice, kachumbari', 'Popular', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85', 180.00, true, 15, 1),
  ('Beef stew & ugali', 'Slow-cooked beef, sukuma wiki, tomato relish', 'Local favourite', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85', 150.00, true, 20, 2),
  ('Beans & chapati', 'Creamy coconut beans, two soft chapatis', 'Plant-based', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85', 120.00, true, 12, 3),
  ('Pilau special', 'Spiced rice, beef kofta, kachumbari', 'Premium', 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=900&q=85', 200.00, true, 18, 4),
  ('Vegetable curry', 'Mixed vegetables, coconut milk, rice', 'Plant-based', 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=85', 130.00, true, 15, 5),
  ('Chicken wings', 'Crispy wings, fries, coleslaw', 'Popular', 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=900&q=85', 220.00, false, 20, 6)
) as seed(name, description, category, image_url, price, is_available, prep_minutes, sort_order)
where not exists (
  select 1 from public.menu_items existing where existing.name = seed.name
);

insert into public.app_settings (key, value, description)
values
  ('ordering_cutoff_time', '"09:00"', 'Daily cutoff in Africa/Nairobi local time.'),
  ('timezone', '"Africa/Nairobi"', 'Timezone used for order cutoff and pickup schedules.'),
  ('same_day_orders_enabled', 'true', 'Whether orders can be scheduled for the same day before cutoff.')
on conflict (key) do nothing;

create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_pickup_schedule_idx on public.orders(pickup_date, pickup_time);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists pickup_slots_date_idx on public.pickup_slots(pickup_date, start_time);

-- SECURITY DEFINER helpers avoid recursive profile RLS evaluation.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $
  select role from public.profiles where id = auth.uid();
$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'kitchen', 'cashier')
  );
$$;

-- Create a profile automatically when a new Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.pickup_locations enable row level security;
alter table public.pickup_slots enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Profiles can read own profile or staff can read all" on public.profiles;
create policy "Profiles can read own profile or staff can read all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists "Users can update own basic profile" on public.profiles;
create policy "Users can update own basic profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.current_user_role());

drop policy if exists "Anyone can view available menu items" on public.menu_items;
create policy "Anyone can view available menu items"
  on public.menu_items for select to anon, authenticated
  using (is_available = true or public.is_staff());

drop policy if exists "Staff manage menu items" on public.menu_items;
create policy "Staff manage menu items"
  on public.menu_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Anyone can view active pickup locations" on public.pickup_locations;
create policy "Anyone can view active pickup locations"
  on public.pickup_locations for select to anon, authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Staff manage pickup locations" on public.pickup_locations;
create policy "Staff manage pickup locations"
  on public.pickup_locations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Anyone can view active pickup slots" on public.pickup_slots;
create policy "Anyone can view active pickup slots"
  on public.pickup_slots for select to anon, authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Staff manage pickup slots" on public.pickup_slots;
create policy "Staff manage pickup slots"
  on public.pickup_slots for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Customers read own orders and staff read all" on public.orders;
create policy "Customers read own orders and staff read all"
  on public.orders for select to authenticated
  using (customer_id = auth.uid() or public.is_staff());

drop policy if exists "Staff update orders" on public.orders;
create policy "Staff update orders"
  on public.orders for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Customers read own order items and staff read all" on public.order_items;
create policy "Customers read own order items and staff read all"
  on public.order_items for select to authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists "Customers read own payments and staff read all" on public.payments;
create policy "Customers read own payments and staff read all"
  on public.payments for select to authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists "Staff manage app settings" on public.app_settings;
create policy "Staff manage app settings"
  on public.app_settings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

commit;
