-- Where each sale happened (market, office, condo, other)
alter table sales
  add column if not exists channel text not null default 'market'
  check (channel in ('market', 'office', 'condo', 'other'));
