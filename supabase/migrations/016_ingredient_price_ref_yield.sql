-- Yield % for ingredient price reference (prep loss when computing true unit cost)
alter table ingredients
  add column if not exists price_ref_yield_percent numeric;

update ingredients
set price_ref_yield_percent = coalesce(price_ref_yield_percent, 100)
where price_ref_yield_percent is null;

alter table ingredients
  add constraint ingredients_price_ref_yield_percent_range
    check (price_ref_yield_percent > 0 and price_ref_yield_percent <= 100);
