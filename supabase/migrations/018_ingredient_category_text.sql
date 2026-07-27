alter table ingredients
  alter column category type text using category::text;

alter table ingredients
  alter column category set default 'อาหาร';

drop type if exists ingredient_category;
