-- Phase 6: PayzaAPI payment initiation and verified payment-state processing.
-- Apply after the Phase 2–5 migrations.

begin;

create unique index if not exists payments_provider_checkout_unique
  on public.payments(provider, provider_checkout_id)
  where provider_checkout_id is not null;

create or replace function public.apply_payza_payment_event(
  p_reference text,
  p_event text,
  p_status text,
  p_amount numeric,
  p_currency text,
  p_provider_transaction_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_new_payment_status text;
  v_new_order_payment_status text;
  v_new_order_status text;
  v_release_stock boolean := false;
begin
  if p_reference is null or p_reference = '' then
    raise exception 'Payment reference is required.';
  end if;
  if p_currency <> 'KES' then
    raise exception 'Unexpected payment currency.';
  end if;
  if p_event not in ('payment.success', 'payment.failed', 'payment.cancelled') then
    return jsonb_build_object('ignored', true, 'reason', 'Unsupported event');
  end if;

  select * into v_payment
  from public.payments
  where provider_checkout_id = p_reference
  for update;

  if not found then
    raise exception 'No payment matches this PayzaAPI reference.';
  end if;

  if abs(v_payment.amount - p_amount) > 0.009 then
    raise exception 'Payment amount does not match the order.';
  end if;

  select * into v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'Order for this payment was not found.';
  end if;

  if v_payment.status = 'succeeded' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'order_id', v_order.id);
  end if;

  if v_payment.status in ('failed', 'refunded') then
    return jsonb_build_object('ok', true, 'duplicate', true, 'order_id', v_order.id);
  end if;

  if p_event = 'payment.success' and p_status = 'success' then
    v_new_payment_status := 'succeeded';
    v_new_order_payment_status := 'paid';
    v_new_order_status := 'confirmed';
  elsif p_event in ('payment.failed', 'payment.cancelled') or p_status in ('failed', 'cancelled') then
    v_new_payment_status := 'failed';
    v_new_order_payment_status := 'failed';
    v_new_order_status := 'cancelled';
    v_release_stock := v_order.status = 'pending_payment';
  else
    return jsonb_build_object('ignored', true, 'reason', 'Payment is not terminal');
  end if;

  update public.payments
  set status = v_new_payment_status,
      provider_transaction_id = coalesce(nullif(p_provider_transaction_id, ''), provider_transaction_id),
      raw_callback = coalesce(p_payload, '{}'::jsonb),
      updated_at = now()
  where id = v_payment.id;

  update public.orders
  set payment_status = v_new_order_payment_status,
      status = v_new_order_status,
      updated_at = now()
  where id = v_order.id;

  if v_release_stock then
    update public.menu_items mi
    set stock_quantity = mi.stock_quantity + oi.quantity,
        updated_at = now()
    from (
      select menu_item_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = v_order.id and menu_item_id is not null
      group by menu_item_id
    ) oi
    where mi.id = oi.menu_item_id
      and mi.stock_quantity is not null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'order_id', v_order.id,
    'payment_status', v_new_payment_status,
    'order_status', v_new_order_status,
    'stock_released', v_release_stock
  );
end;
$$;

revoke all on function public.apply_payza_payment_event(text, text, text, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_payza_payment_event(text, text, text, numeric, text, text, jsonb) to service_role;

commit;
