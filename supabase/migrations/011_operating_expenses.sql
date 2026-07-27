-- Simple operating expenses for estimating profit after shop expenses
create table if not exists operating_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_operating_expenses_user_date
  on operating_expenses(user_id, expense_date desc);

alter table operating_expenses enable row level security;

create policy "Users manage own operating expenses"
  on operating_expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
