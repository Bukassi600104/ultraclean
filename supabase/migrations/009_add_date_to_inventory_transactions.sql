-- Add explicit date field to farm_inventory_transactions
-- so managers can record the actual date mortality/stock change happened
-- (they may log it the next day, not at the moment it happens)

alter table public.farm_inventory_transactions
  add column if not exists date date not null default current_date;

create index if not exists idx_farm_inv_tx_date
  on public.farm_inventory_transactions(date desc);
create index if not exists idx_farm_inv_tx_action
  on public.farm_inventory_transactions(action);
