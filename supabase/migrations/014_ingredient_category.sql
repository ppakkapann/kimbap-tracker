create type ingredient_category as enum ('food', 'packaging', 'other');

alter table ingredients
  add column category ingredient_category not null default 'food';

create index idx_ingredients_category on ingredients(user_id, category);
