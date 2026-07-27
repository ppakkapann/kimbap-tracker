-- Group multi-item sales into one bill; track purchase supplier and expiry

alter table sales
  add column if not exists bill_id uuid;

create index if not exists idx_sales_bill on sales(bill_id);

alter table purchases
  add column if not exists supplier text,
  add column if not exists expires_at date;
