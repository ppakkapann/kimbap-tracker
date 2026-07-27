-- ราคาอ้างอิงสำหรับคิดต้นทุน (ไม่ใช่การซื้อจริง — การซื้อจริงอยู่ใน purchases + stock_movements)
alter table ingredients
  add column if not exists price_ref_quantity numeric check (price_ref_quantity is null or price_ref_quantity > 0),
  add column if not exists price_ref_total numeric check (price_ref_total is null or price_ref_total >= 0);
