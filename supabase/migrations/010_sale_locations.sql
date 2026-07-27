-- Optional normalized locations (future use). App uses free-text sales.channel (008/009).
-- Do not drop sales.channel — app reads/writes channel for sale platform/location labels.
create table if not exists sale_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table sales
  add column if not exists location_id uuid references sale_locations(id) on delete set null;

create index if not exists idx_sale_locations_user on sale_locations(user_id);
create index if not exists idx_sales_location on sales(location_id);

alter table sale_locations enable row level security;

create policy "Users manage own sale locations"
  on sale_locations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
