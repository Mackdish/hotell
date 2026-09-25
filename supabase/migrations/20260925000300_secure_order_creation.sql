-- Phase 4: server-validated, atomic customer order creation.
-- The RPC uses the caller's Supabase Auth identity and reads prices from the database.
--
-- Fixes vs. previous version:
--   1. Aggregates duplicate item names before checking stock, so splitting a
--      quantity across multiple array entries can no longer bypass the check.
--   2. Locks the matched menu_items rows with FOR UPDATE and decrements
--      stock_quantity in the same statement, closing the oversell race
--      condition and making the stock check actually mean something.
--   3. Resolves each item exactly once (id, name, price, quantity) and reuses
--      that data for both the order_items insert and the JSON response,
--      instead of re-querying by name a second time with no "not found" check.
begin;

create or replace function public.create_customer_order(
  p_items jsonb,
  p_pickup_location text,
  p_payment_method text,
  p_pickup_date date,
  p_pickup_time time,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_location public.pickup_locations%rowtype;
  v_order public.orders%rowtype;
  v_raw_item jsonb;
  v_quantity integer;
  v_now_local timestamp := now() at time zone 'Africa/Nairobi';
  v_cutoff time := time '09:00';

  -- resolved, aggregated line items (one row per distinct item name)
  v_item_ids uuid[] := '{}';
  v_item_names text[] := '{}';
  v_item_prices numeric(10,2)[] := '{}';
  v_item_quantities integer[] := '{}';
  v_subtotal numeric(10,2) := 0;

  v_payment_method text;
  v_payment_status text;

  v_name text;
  v_idx integer;
  v_menu record;
  i integer;
begin
  if v_user_id is null then
    raise exception 'Sign in before placing an order.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Add between 1 and 30 menu items.';
  end if;

  if p_pickup_date is null or p_pickup_time is null then
    raise exception 'Choose a pickup date and time.';
  end if;

  if p_pickup_date < v_now_local::date then
    raise exception 'Pickup date cannot be in the past.';
  end if;

  if p_pickup_date = v_now_local::date and v_now_local::time >= v_cutoff then
    raise exception 'Same-day ordering closes at 9:00 AM East Africa Time. Choose a later date.';
  end if;

  if (p_pickup_date + p_pickup_time) <= v_now_local then
    raise exception 'Choose a pickup time in the future.';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Your customer profile is missing. Sign out and sign in again.';
  end if;

  select * into v_location
  from public.pickup_locations
  where name = p_pickup_location and is_active = true
  limit 1;
  if not found then
    raise exception 'Choose an active pickup location.';
  end if;

  if p_payment_method is null or p_payment_method not in ('mpesa', 'pickup') then
    raise exception 'Choose a supported payment method.';
  end if;
  v_payment_method := case when p_payment_method = 'pickup' then 'cash' else p_payment_method end;
  v_payment_status := case when p_payment_method = 'pickup' then 'pay_on_pickup' else 'pending' end;

  -- Pass 1: validate each raw entry's shape, and aggregate quantities by name
  -- (using a temp key/value pair of arrays keyed by name).
  for v_raw_item in select value from jsonb_array_elements(p_items)
  loop
    v_name := v_raw_item->>'name';
    if coalesce(v_name, '') = '' then
      raise exception 'Menu item name is required.';
    end if;

    begin
      v_quantity := (v_raw_item->>'quantity')::integer;
    exception when others then
      raise exception 'Item quantity must be a whole number.';
    end;
    if v_quantity < 1 or v_quantity > 50 then
      raise exception 'Item quantity must be between 1 and 50.';
    end if;

    v_idx := array_position(v_item_names, v_name);
    if v_idx is null then
      v_item_names := v_item_names || v_name;
      v_item_quantities := v_item_quantities || v_quantity;
    else
      v_item_quantities[v_idx] := v_item_quantities[v_idx] + v_quantity;
    end if;
  end loop;

  -- Combined quantity per distinct item must still respect the per-item limit.
  for i in 1 .. array_length(v_item_names, 1) loop
    if v_item_quantities[i] > 50 then
      raise exception 'Item quantity must be between 1 and 50.';
    end if;
  end loop;

  -- Pass 2: resolve each distinct item against menu_items, locking the row
  -- and decrementing stock atomically so concurrent orders can't oversell.
  for i in 1 .. array_length(v_item_names, 1) loop
    select id, name, price, stock_quantity into v_menu
    from public.menu_items
    where name = v_item_names[i] and is_available = true
    limit 1
    for update;

    if not found then
      raise exception 'A selected menu item is unavailable. Refresh the menu and try again.';
    end if;

    if v_menu.stock_quantity is not null and v_menu.stock_quantity < v_item_quantities[i] then
      raise exception 'Not enough stock for %.', v_menu.name;
    end if;

    if v_menu.stock_quantity is not null then
      update public.menu_items
      set stock_quantity = stock_quantity - v_item_quantities[i]
      where id = v_menu.id;
    end if;

    v_item_ids := v_item_ids || v_menu.id;
    v_item_prices := v_item_prices || v_menu.price;
    v_subtotal := v_subtotal + (v_menu.price * v_item_quantities[i]);
  end loop;

  insert into public.orders (
    customer_id, customer_name, customer_phone, pickup_location_id,
    pickup_date, pickup_time, status, payment_method, payment_status,
    subtotal, total, notes
  ) values (
    v_user_id, coalesce(nullif(v_profile.full_name, ''), 'Customer'),
    coalesce(v_profile.phone, ''), v_location.id,
    p_pickup_date, p_pickup_time, 'confirmed', v_payment_method, v_payment_status,
    v_subtotal, v_subtotal, coalesce(left(p_notes, 1000), '')
  )
  returning * into v_order;

  for i in 1 .. array_length(v_item_names, 1) loop
    insert into public.order_items (order_id, menu_item_id, item_name, unit_price, quantity)
    values (v_order.id, v_item_ids[i], v_item_names[i], v_item_prices[i], v_item_quantities[i]);
  end loop;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'pickup_date', v_order.pickup_date,
    'pickup_time', v_order.pickup_time,
    'subtotal', v_order.subtotal,
    'total', v_order.total,
    'notes', v_order.notes,
    'created_at', v_order.created_at,
    'pickup_location', v_location.name,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'mealName', oi.item_name,
        'quantity', oi.quantity,
        'price', oi.unit_price,
        'totalPrice', oi.line_total
      )), '[]'::jsonb)
      from public.order_items oi where oi.order_id = v_order.id
    )
  );
end;
$$;

revoke all on function public.create_customer_order(jsonb, text, text, date, time, text) from public, anon;
grant execute on function public.create_customer_order(jsonb, text, text, date, time, text) to authenticated;

commit;