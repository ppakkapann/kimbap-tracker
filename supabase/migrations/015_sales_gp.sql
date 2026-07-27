-- Platform GP deduction on sales (Grab/Lineman commission, etc.)
alter table sales
  add column if not exists gp_percent numeric not null default 0
    check (gp_percent >= 0 and gp_percent <= 100);
