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
