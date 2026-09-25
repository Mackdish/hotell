-- Phase 4: server-validated, atomic customer order creation.
-- The RPC uses the caller's Supabase Auth identity and reads prices from the database.
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
  v_item jsonb;
  v_menu public.menu_items%rowtype;
  v_quantity integer;
  v_subtotal numeric(10,2) := 0;
  v_item_count integer := 0;
  v_payment_method text;
  v_payment_status text;
  v_now_local timestamp := now() at time zone 'Africa/Nairobi';
  v_cutoff time := time '09:00';
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

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_item_count := v_item_count + 1;
    if coalesce(v_item->>'name', '') = '' then
      raise exception 'Menu item name is required.';
    end if;
    begin
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Item quantity must be a whole number.';
    end;
    if v_quantity < 1 or v_quantity > 50 then
      raise exception 'Item quantity must be between 1 and 50.';
    end if;

    select * into v_menu
    from public.menu_items
    where name = v_item->>'name' and is_available = true
    limit 1;
    if not found then
      raise exception 'A selected menu item is unavailable. Refresh the menu and try again.';
    end if;

    if v_menu.stock_quantity is not null and v_menu.stock_quantity < v_quantity then
      raise exception 'Not enough stock for ' || v_menu.name || '.';
    end if;
    v_subtotal := v_subtotal + (v_menu.price * v_quantity);
  end loop;

  if v_item_count <> jsonb_array_length(p_items) then
    raise exception 'Invalid order items.';
  end if;

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

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_menu
    from public.menu_items
    where name = v_item->>'name' and is_available = true
    limit 1;

    insert into public.order_items (order_id, menu_item_id, item_name, unit_price, quantity)
    values (v_order.id, v_menu.id, v_menu.name, v_menu.price, v_quantity);
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
