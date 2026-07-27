-- Custom display label per ingredient (e.g. สาหร่าย → แผ่น instead of ชิ้น)
alter table ingredients
  add column if not exists unit_label text;
