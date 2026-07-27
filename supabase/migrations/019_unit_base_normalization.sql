-- Normalize ingredient storage to base units (g, ml, piece).
-- kg/l quantities ×1000; unit costs ÷1000. bunch → piece (no scaling).

-- --- Mass (kg → g) ---

update purchases p
set
  quantity = p.quantity * 1000,
  gross_quantity = case
    when p.gross_quantity is not null then p.gross_quantity * 1000
    else p.gross_quantity
  end,
  unit_cost = p.unit_cost / 1000,
  gross_unit_cost = case
    when p.gross_unit_cost is not null then p.gross_unit_cost / 1000
    else p.gross_unit_cost
  end
from ingredients i
where p.ingredient_id = i.id
  and i.unit = 'kg';

update recipe_items ri
set
  quantity_per_roll = ri.quantity_per_roll * 1000,
  batch_quantity = case
    when ri.batch_quantity is not null then ri.batch_quantity * 1000
    else ri.batch_quantity
  end
from ingredients i
where ri.ingredient_id = i.id
  and i.unit = 'kg';

update stock_movements sm
set quantity = sm.quantity * 1000
from ingredients i
where sm.ingredient_id = i.id
  and i.unit = 'kg';

update ingredients
set
  current_stock = current_stock * 1000,
  low_stock_alert = low_stock_alert * 1000,
  price_ref_quantity = case
    when price_ref_quantity is not null then price_ref_quantity * 1000
    else null
  end,
  avg_unit_cost = case
    when avg_unit_cost > 0 then avg_unit_cost / 1000
    else avg_unit_cost
  end,
  unit = 'g'
where unit = 'kg';

-- --- Volume (l → ml) ---

update purchases p
set
  quantity = p.quantity * 1000,
  gross_quantity = case
    when p.gross_quantity is not null then p.gross_quantity * 1000
    else p.gross_quantity
  end,
  unit_cost = p.unit_cost / 1000,
  gross_unit_cost = case
    when p.gross_unit_cost is not null then p.gross_unit_cost / 1000
    else p.gross_unit_cost
  end
from ingredients i
where p.ingredient_id = i.id
  and i.unit = 'l';

update recipe_items ri
set
  quantity_per_roll = ri.quantity_per_roll * 1000,
  batch_quantity = case
    when ri.batch_quantity is not null then ri.batch_quantity * 1000
    else ri.batch_quantity
  end
from ingredients i
where ri.ingredient_id = i.id
  and i.unit = 'l';

update stock_movements sm
set quantity = sm.quantity * 1000
from ingredients i
where sm.ingredient_id = i.id
  and i.unit = 'l';

update ingredients
set
  current_stock = current_stock * 1000,
  low_stock_alert = low_stock_alert * 1000,
  price_ref_quantity = case
    when price_ref_quantity is not null then price_ref_quantity * 1000
    else null
  end,
  avg_unit_cost = case
    when avg_unit_cost > 0 then avg_unit_cost / 1000
    else avg_unit_cost
  end,
  unit = 'ml'
where unit = 'l';

-- --- Count (bunch → piece) ---

update ingredients
set unit = 'piece'
where unit = 'bunch';
