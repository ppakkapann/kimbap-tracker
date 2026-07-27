-- ซื้อแล้วรอเตรียม (ปอก/ตัด) ก่อนคิดต้นทุนจริง
alter table purchases
  add column if not exists prep_pending boolean not null default false;

create index if not exists idx_purchases_prep_pending
  on purchases(ingredient_id, prep_pending)
  where prep_pending = true;
