-- Kimbap Tracker — full schema (migrations 001–020)
-- Paste into Supabase SQL Editor and Run once on a fresh project.

-- ========== 001_initial_schema.sql ==========
-- Kimbap Tracker Schema

create type stock_movement_type as enum ('purchase', 'usage', 'adjustment');
create type ingredient_unit as enum ('g', 'kg', 'piece', 'bunch', 'ml', 'l');

-- Ingredients
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unit ingredient_unit not null default 'g',
  current_stock numeric not null default 0,
  low_stock_alert numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Purchase history
create table purchases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  total_price numeric not null check (total_price >= 0),
  unit_cost numeric not null check (unit_cost >= 0),
  purchased_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- Products (menu items)
create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  selling_price numeric not null check (selling_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Recipe (BOM)
create table recipe_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  quantity_per_roll numeric not null check (quantity_per_roll > 0),
  unique (product_id, ingredient_id)
);

-- Sales
create table sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  sale_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- Stock movements
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type stock_movement_type not null,
  quantity numeric not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_ingredients_user on ingredients(user_id);
create index idx_purchases_ingredient on purchases(ingredient_id);
create index idx_purchases_user on purchases(user_id);
create index idx_products_user on products(user_id);
create index idx_recipe_items_product on recipe_items(product_id);
create index idx_sales_user_date on sales(user_id, sale_date);
create index idx_stock_movements_ingredient on stock_movements(ingredient_id);

-- RLS
alter table ingredients enable row level security;
alter table purchases enable row level security;
alter table products enable row level security;
alter table recipe_items enable row level security;
alter table sales enable row level security;
alter table stock_movements enable row level security;

create policy "Users manage own ingredients"
  on ingredients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own purchases"
  on purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own products"
  on products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own recipe items"
  on recipe_items for all
  using (exists (select 1 from products p where p.id = product_id and p.user_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.user_id = auth.uid()));

create policy "Users manage own sales"
  on sales for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own stock movements"
  on stock_movements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ========== 002_ingredient_sort_order.sql ==========
-- Ingredient display order (drag to reorder in UI)
alter table ingredients add column if not exists sort_order integer not null default 0;

-- Backfill existing rows by created_at
with ranked as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as rn
  from ingredients
)
update ingredients i
set sort_order = ranked.rn
from ranked
where i.id = ranked.id and i.sort_order = 0;

create index if not exists idx_ingredients_user_sort on ingredients(user_id, sort_order);


-- ========== 003_ingredient_unit_label.sql ==========
-- Custom display label per ingredient (e.g. สาหร่าย → แผ่น instead of ชิ้น)
alter table ingredients
  add column if not exists unit_label text;


-- ========== 004_accounting.sql ==========
-- Weighted average cost + movement unit cost for accounting

alter table ingredients
  add column if not exists avg_unit_cost numeric not null default 0;

alter table stock_movements
  add column if not exists unit_cost numeric;


-- ========== 005_stock_waste.sql ==========
-- Track non-sale ingredient usage separately from stock counts.
alter type stock_movement_type add value if not exists 'waste';

alter table stock_movements
  add column if not exists reason text;

alter table stock_movements
  drop constraint if exists stock_movements_reason_check;

alter table stock_movements
  add constraint stock_movements_reason_check
  check (
    reason is null
    or reason in ('spoilage', 'unsold', 'test', 'personal', 'other', 'count')
  );

create index if not exists idx_stock_movements_user_created
  on stock_movements(user_id, created_at desc);

create or replace function record_ingredient_waste(
  p_ingredient_id uuid,
  p_quantity numeric,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ingredient ingredients%rowtype;
begin
  if p_quantity <= 0 then
    raise exception 'จำนวนที่ตัดออกต้องมากกว่า 0';
  end if;

  select *
  into v_ingredient
  from ingredients
  where id = p_ingredient_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'ไม่พบวัตถุดิบ';
  end if;

  if p_quantity > v_ingredient.current_stock then
    raise exception 'ตัดออกเกินสต็อกที่มี (%)', v_ingredient.current_stock;
  end if;

  update ingredients
  set current_stock = current_stock - p_quantity
  where id = p_ingredient_id;

  insert into stock_movements (
    ingredient_id,
    user_id,
    type,
    quantity,
    unit_cost,
    reason,
    note
  )
  values (
    p_ingredient_id,
    auth.uid(),
    'waste',
    -p_quantity,
    coalesce(v_ingredient.avg_unit_cost, 0),
    p_reason,
    p_note
  );
end;
$$;

create or replace function record_product_waste(
  p_product_id uuid,
  p_quantity integer,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product products%rowtype;
  v_recipe_count integer;
  v_row record;
  v_required numeric;
begin
  if p_quantity <= 0 then
    raise exception 'จำนวนม้วนต้องมากกว่า 0';
  end if;

  select *
  into v_product
  from products
  where id = p_product_id and user_id = auth.uid();

  if not found then
    raise exception 'ไม่พบเมนู';
  end if;

  select count(*)
  into v_recipe_count
  from recipe_items
  where product_id = p_product_id;

  if v_recipe_count = 0 then
    raise exception 'เมนูนี้ยังไม่มีสูตรวัตถุดิบ';
  end if;

  -- Lock and validate every ingredient before changing any stock.
  for v_row in
    select
      i.id,
      i.name,
      i.current_stock,
      i.avg_unit_cost,
      r.quantity_per_roll
    from recipe_items r
    join ingredients i on i.id = r.ingredient_id
    where r.product_id = p_product_id
      and i.user_id = auth.uid()
    order by i.id
    for update of i
  loop
    v_required := v_row.quantity_per_roll * p_quantity;
    if v_required > v_row.current_stock then
      raise exception '% มีไม่พอ (ต้องใช้ %)', v_row.name, v_required;
    end if;
  end loop;

  for v_row in
    select
      i.id,
      i.avg_unit_cost,
      r.quantity_per_roll
    from recipe_items r
    join ingredients i on i.id = r.ingredient_id
    where r.product_id = p_product_id
      and i.user_id = auth.uid()
  loop
    v_required := v_row.quantity_per_roll * p_quantity;

    update ingredients
    set current_stock = current_stock - v_required
    where id = v_row.id;

    insert into stock_movements (
      ingredient_id,
      user_id,
      type,
      quantity,
      unit_cost,
      reference_id,
      reason,
      note
    )
    values (
      v_row.id,
      auth.uid(),
      'waste',
      -v_required,
      coalesce(v_row.avg_unit_cost, 0),
      p_product_id,
      p_reason,
      p_note
    );
  end loop;
end;
$$;


-- ========== 006_recipe_batch.sql ==========
-- Recipe batch: ใช้ X หน่วย → ทำได้ Y แถว (quantity_per_roll = batch_quantity / batch_yield)

alter table recipe_items
  add column if not exists batch_quantity numeric check (batch_quantity is null or batch_quantity > 0),
  add column if not exists batch_yield numeric check (batch_yield is null or batch_yield > 0);

-- Backfill existing rows as 1 แถว per quantity_per_roll
update recipe_items
set
  batch_quantity = quantity_per_roll,
  batch_yield = 1
where batch_quantity is null and batch_yield is null;


-- ========== 007_ingredient_price_ref.sql ==========
-- ราคาอ้างอิงสำหรับคิดต้นทุน (ไม่ใช่การซื้อจริง — การซื้อจริงอยู่ใน purchases + stock_movements)
alter table ingredients
  add column if not exists price_ref_quantity numeric check (price_ref_quantity is null or price_ref_quantity > 0),
  add column if not exists price_ref_total numeric check (price_ref_total is null or price_ref_total >= 0);


-- ========== 008_sales_channel.sql ==========
-- Where each sale happened (market, office, condo, other)
alter table sales
  add column if not exists channel text not null default 'market'
  check (channel in ('market', 'office', 'condo', 'other'));


-- ========== 009_sales_location_free_text.sql ==========
-- Allow custom sale locations (Notion-style tags)
alter table sales drop constraint if exists sales_channel_check;

alter table sales alter column channel drop default;
alter table sales alter column channel drop not null;

update sales
set channel = case channel
  when 'market' then 'ตลาด'
  when 'office' then 'ที่ทำงาน'
  when 'condo' then 'คอนโด'
  when 'other' then 'อื่นๆ'
  else channel
end
where channel in ('market', 'office', 'condo', 'other');


-- ========== 010_sale_locations.sql ==========
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


-- ========== 011_operating_expenses.sql ==========
-- Simple operating expenses for estimating profit after shop expenses
create table if not exists operating_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_operating_expenses_user_date
  on operating_expenses(user_id, expense_date desc);

alter table operating_expenses enable row level security;

create policy "Users manage own operating expenses"
  on operating_expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ========== 012_purchase_yield.sql ==========
-- Optional prep yield for purchases.
-- purchases.quantity remains the usable quantity added to stock, so old reports stay compatible.
alter table purchases
  add column if not exists gross_quantity numeric,
  add column if not exists yield_percent numeric,
  add column if not exists gross_unit_cost numeric;

update purchases
set
  gross_quantity = coalesce(gross_quantity, quantity),
  yield_percent = coalesce(yield_percent, 100),
  gross_unit_cost = coalesce(gross_unit_cost, unit_cost)
where
  gross_quantity is null
  or yield_percent is null
  or gross_unit_cost is null;

alter table purchases
  add constraint purchases_gross_quantity_positive
    check (gross_quantity > 0),
  add constraint purchases_yield_percent_range
    check (yield_percent > 0 and yield_percent <= 100),
  add constraint purchases_gross_unit_cost_nonnegative
    check (gross_unit_cost >= 0);


-- ========== 013_product_cost_targets.sql ==========
-- Per-menu ingredient cost targets. Existing and new menus default to 30–35%.
alter table products
  add column if not exists target_cost_min_percent numeric not null default 30,
  add column if not exists target_cost_max_percent numeric not null default 35;

alter table products
  add constraint products_target_cost_min_range
    check (target_cost_min_percent > 0 and target_cost_min_percent <= 100),
  add constraint products_target_cost_max_range
    check (target_cost_max_percent > 0 and target_cost_max_percent <= 100),
  add constraint products_target_cost_order
    check (target_cost_min_percent <= target_cost_max_percent);


-- ========== 014_ingredient_category.sql ==========
create type ingredient_category as enum ('food', 'packaging', 'other');

alter table ingredients
  add column category ingredient_category not null default 'food';

create index idx_ingredients_category on ingredients(user_id, category);


-- ========== 015_sales_gp.sql ==========
-- Platform GP deduction on sales (Grab/Lineman commission, etc.)
alter table sales
  add column if not exists gp_percent numeric not null default 0
    check (gp_percent >= 0 and gp_percent <= 100);


-- ========== 016_ingredient_price_ref_yield.sql ==========
-- Yield % for ingredient price reference (prep loss when computing true unit cost)
alter table ingredients
  add column if not exists price_ref_yield_percent numeric;

update ingredients
set price_ref_yield_percent = coalesce(price_ref_yield_percent, 100)
where price_ref_yield_percent is null;

alter table ingredients
  add constraint ingredients_price_ref_yield_percent_range
    check (price_ref_yield_percent > 0 and price_ref_yield_percent <= 100);


-- ========== 017_sale_bill_purchase_lot.sql ==========
-- Group multi-item sales into one bill; track purchase supplier and expiry

alter table sales
  add column if not exists bill_id uuid;

create index if not exists idx_sales_bill on sales(bill_id);

alter table purchases
  add column if not exists supplier text,
  add column if not exists expires_at date;


-- ========== 018_ingredient_category_text.sql ==========
alter table ingredients
  alter column category type text using category::text;

alter table ingredients
  alter column category set default 'อาหาร';

drop type if exists ingredient_category;


-- ========== 019_unit_base_normalization.sql ==========
-- Normalize ingredient storage to base units (g, ml, piece).
-- kg/l quantities ×1000; unit costs ÷1000. bunch → piece (no scaling).

-- --- Mass (kg → g) ---

update purchases p
set
  quantity = p.quantity * 1000,
  gross_quantity = case
    when p.gross_quantity is not null then p.gross_quantity * 1000
    else p.gross_quantity
  end,
  unit_cost = p.unit_cost / 1000,
  gross_unit_cost = case
    when p.gross_unit_cost is not null then p.gross_unit_cost / 1000
    else p.gross_unit_cost
  end
from ingredients i
where p.ingredient_id = i.id
  and i.unit = 'kg';

update recipe_items ri
set
  quantity_per_roll = ri.quantity_per_roll * 1000,
  batch_quantity = case
    when ri.batch_quantity is not null then ri.batch_quantity * 1000
    else ri.batch_quantity
  end
from ingredients i
where ri.ingredient_id = i.id
  and i.unit = 'kg';

update stock_movements sm
set quantity = sm.quantity * 1000
from ingredients i
where sm.ingredient_id = i.id
  and i.unit = 'kg';

update ingredients
set
  current_stock = current_stock * 1000,
  low_stock_alert = low_stock_alert * 1000,
  price_ref_quantity = case
    when price_ref_quantity is not null then price_ref_quantity * 1000
    else null
  end,
  avg_unit_cost = case
    when avg_unit_cost > 0 then avg_unit_cost / 1000
    else avg_unit_cost
  end,
  unit = 'g'
where unit = 'kg';

-- --- Volume (l → ml) ---

update purchases p
set
  quantity = p.quantity * 1000,
  gross_quantity = case
    when p.gross_quantity is not null then p.gross_quantity * 1000
    else p.gross_quantity
  end,
  unit_cost = p.unit_cost / 1000,
  gross_unit_cost = case
    when p.gross_unit_cost is not null then p.gross_unit_cost / 1000
    else p.gross_unit_cost
  end
from ingredients i
where p.ingredient_id = i.id
  and i.unit = 'l';

update recipe_items ri
set
  quantity_per_roll = ri.quantity_per_roll * 1000,
  batch_quantity = case
    when ri.batch_quantity is not null then ri.batch_quantity * 1000
    else ri.batch_quantity
  end
from ingredients i
where ri.ingredient_id = i.id
  and i.unit = 'l';

update stock_movements sm
set quantity = sm.quantity * 1000
from ingredients i
where sm.ingredient_id = i.id
  and i.unit = 'l';

update ingredients
set
  current_stock = current_stock * 1000,
  low_stock_alert = low_stock_alert * 1000,
  price_ref_quantity = case
    when price_ref_quantity is not null then price_ref_quantity * 1000
    else null
  end,
  avg_unit_cost = case
    when avg_unit_cost > 0 then avg_unit_cost / 1000
    else avg_unit_cost
  end,
  unit = 'ml'
where unit = 'l';

-- --- Count (bunch → piece) ---

update ingredients
set unit = 'piece'
where unit = 'bunch';


-- ========== 020_prep_pending.sql ==========
-- ซื้อแล้วรอเตรียม (ปอก/ตัด) ก่อนคิดต้นทุนจริง
alter table purchases
  add column if not exists prep_pending boolean not null default false;

create index if not exists idx_purchases_prep_pending
  on purchases(ingredient_id, prep_pending)
  where prep_pending = true;


