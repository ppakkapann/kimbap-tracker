-- Track non-sale ingredient usage separately from stock counts.
alter type stock_movement_type add value if not exists 'waste';

alter table stock_movements
  add column if not exists reason text;

alter table stock_movements
  drop constraint if exists stock_movements_reason_check;

alter table stock_movements
  add constraint stock_movements_reason_check
  check (
    reason is null
    or reason in ('spoilage', 'unsold', 'test', 'personal', 'other', 'count')
  );

create index if not exists idx_stock_movements_user_created
  on stock_movements(user_id, created_at desc);

create or replace function record_ingredient_waste(
  p_ingredient_id uuid,
  p_quantity numeric,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ingredient ingredients%rowtype;
begin
  if p_quantity <= 0 then
    raise exception 'จำนวนที่ตัดออกต้องมากกว่า 0';
  end if;

  select *
  into v_ingredient
  from ingredients
  where id = p_ingredient_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'ไม่พบวัตถุดิบ';
  end if;

  if p_quantity > v_ingredient.current_stock then
    raise exception 'ตัดออกเกินสต็อกที่มี (%)', v_ingredient.current_stock;
  end if;

  update ingredients
  set current_stock = current_stock - p_quantity
  where id = p_ingredient_id;

  insert into stock_movements (
    ingredient_id,
    user_id,
    type,
    quantity,
    unit_cost,
    reason,
    note
  )
  values (
    p_ingredient_id,
    auth.uid(),
    'waste',
    -p_quantity,
    coalesce(v_ingredient.avg_unit_cost, 0),
    p_reason,
    p_note
  );
end;
$$;

create or replace function record_product_waste(
  p_product_id uuid,
  p_quantity integer,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product products%rowtype;
  v_recipe_count integer;
  v_row record;
  v_required numeric;
begin
  if p_quantity <= 0 then
    raise exception 'จำนวนม้วนต้องมากกว่า 0';
  end if;

  select *
  into v_product
  from products
  where id = p_product_id and user_id = auth.uid();

  if not found then
    raise exception 'ไม่พบเมนู';
  end if;

  select count(*)
  into v_recipe_count
  from recipe_items
  where product_id = p_product_id;

  if v_recipe_count = 0 then
    raise exception 'เมนูนี้ยังไม่มีสูตรวัตถุดิบ';
  end if;

  -- Lock and validate every ingredient before changing any stock.
  for v_row in
    select
      i.id,
      i.name,
      i.current_stock,
      i.avg_unit_cost,
      r.quantity_per_roll
    from recipe_items r
    join ingredients i on i.id = r.ingredient_id
    where r.product_id = p_product_id
      and i.user_id = auth.uid()
    order by i.id
    for update of i
  loop
    v_required := v_row.quantity_per_roll * p_quantity;
    if v_required > v_row.current_stock then
      raise exception '% มีไม่พอ (ต้องใช้ %)', v_row.name, v_required;
    end if;
  end loop;

  for v_row in
    select
      i.id,
      i.avg_unit_cost,
      r.quantity_per_roll
    from recipe_items r
    join ingredients i on i.id = r.ingredient_id
    where r.product_id = p_product_id
      and i.user_id = auth.uid()
  loop
    v_required := v_row.quantity_per_roll * p_quantity;

    update ingredients
    set current_stock = current_stock - v_required
    where id = v_row.id;

    insert into stock_movements (
      ingredient_id,
      user_id,
      type,
      quantity,
      unit_cost,
      reference_id,
      reason,
      note
    )
    values (
      v_row.id,
      auth.uid(),
      'waste',
      -v_required,
      coalesce(v_row.avg_unit_cost, 0),
      p_product_id,
      p_reason,
      p_note
    );
  end loop;
end;
$$;
