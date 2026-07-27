-- Reset all app data (run in Supabase SQL Editor on production project)
-- Does NOT drop schema — only clears rows. Safe to run after migrations are applied.
-- Also delete auth users manually: Dashboard → Authentication → Users

truncate table operating_expenses restart identity cascade;
truncate table stock_movements restart identity cascade;
truncate table sales restart identity cascade;
truncate table recipe_items restart identity cascade;
truncate table purchases restart identity cascade;
truncate table sale_locations restart identity cascade;
truncate table products restart identity cascade;
truncate table ingredients restart identity cascade;
