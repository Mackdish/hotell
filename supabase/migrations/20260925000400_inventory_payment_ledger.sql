-- Phase 5: atomic inventory deduction and payment ledger initialization.
-- Stock is decremented inside the order transaction. If any item is unavailable
-- or stock is insufficient, the entire order creation rolls back.
-- Apply after migrations 20260925000100 through 20260925000300.

begin;

create or replace function public.reserve_menu_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_menu public.menu_items%rowtype;
begin
  if new.menu_item_id is null then
    raise exception 'Menu item reference is required for inventory tracking.';
  end if;

  select * into v_menu
  from public.menu_items
  where id = new.menu_item_id
  for update;

  if not found or not v_menu.is_available then
    raise exception 'A selected menu item is unavailable. Refresh the menu and try again.';
  end if;

  if v_menu.stock_quantity is not null then
    if v_menu.stock_quantity < new.quantity then
      raise exception 'Not enough stock for %.', v_menu.name;
    end if;

    update public.menu_items
    set stock_quantity = stock_quantity - new.quantity,
        updated_at = now()
    where id = new.menu_item_id;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_reserve_stock on public.order_items;
create trigger order_items_reserve_stock
  before insert on public.order_items
  for each row execute function public.reserve_menu_item_stock();

create or replace function public.set_order_payment_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_method = 'mpesa' and new.payment_status = 'pending' then
    new.status := 'pending_payment';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_payment_state on public.orders;
create trigger orders_set_payment_state
  before insert on public.orders
  for each row execute function public.set_order_payment_state();

create or replace function public.create_initial_payment_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.payments (
    order_id, provider, status, amount, currency, phone_number
  )
  values (
    new.id,
    case when new.payment_method = 'cash' then 'cash' else new.payment_method end,
    'pending',
    new.total,
    'KES',
    nullif(new.customer_phone, '')
  );
  return new;
end;
$$;

drop trigger if exists orders_create_payment_record on public.orders;
create trigger orders_create_payment_record
  after insert on public.orders
  for each row execute function public.create_initial_payment_record();

revoke all on function public.reserve_menu_item_stock() from public, anon, authenticated;
revoke all on function public.set_order_payment_state() from public, anon, authenticated;
revoke all on function public.create_initial_payment_record() from public, anon, authenticated;

commit;
