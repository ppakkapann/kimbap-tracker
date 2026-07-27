-- Ingredient display order (drag to reorder in UI)
alter table ingredients add column if not exists sort_order integer not null default 0;

-- Backfill existing rows by created_at
with ranked as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as rn
  from ingredients
)
update ingredients i
set sort_order = ranked.rn
from ranked
where i.id = ranked.id and i.sort_order = 0;

create index if not exists idx_ingredients_user_sort on ingredients(user_id, sort_order);
