-- Weighted average cost + movement unit cost for accounting

alter table ingredients
  add column if not exists avg_unit_cost numeric not null default 0;

alter table stock_movements
  add column if not exists unit_cost numeric;
