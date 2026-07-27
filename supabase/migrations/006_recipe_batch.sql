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
