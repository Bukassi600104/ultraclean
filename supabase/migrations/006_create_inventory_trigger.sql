-- Trigger function: auto-update farm_inventory on new transaction
create or replace function public.update_inventory()
returns trigger as $$
begin
  -- Upsert the inventory row
  insert into public.farm_inventory (product, current_stock, last_updated)
  values (new.product, 0, now())
  on conflict (product) do nothing;

  -- Update stock based on action
  if new.action = 'add' then
    update public.farm_inventory
    set current_stock = current_stock + new.quantity,
        last_updated = now()
    where product = new.product;
  elsif new.action in ('remove', 'sale', 'mortality') then
    update public.farm_inventory
    set current_stock = current_stock - new.quantity,
        last_updated = now()
    where product = new.product;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_inventory_transaction
  after insert on public.farm_inventory_transactions
  for each row execute function public.update_inventory();
