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
