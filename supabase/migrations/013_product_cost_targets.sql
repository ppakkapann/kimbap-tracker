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
