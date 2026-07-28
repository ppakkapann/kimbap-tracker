"use client";

import { Trash2 } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { NumberInput } from "@/components/ui";
import { nativeSelectStyle } from "@/components/ui/native-controls";
import type { groupIngredientsForSelect } from "@/lib/ingredient-categories";
import { rollsYieldColor, stockDisplayColor } from "@/lib/recipe-yield";
import type { Ingredient } from "@/lib/types";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";
import { YIELD_UNIT } from "@/lib/yield-unit";

type IngredientGroup = ReturnType<typeof groupIngredientsForSelect>[number];

export interface BomRowData {
  ingredient_id: string;
  quantity_per_roll: string;
}

export function BomMobileRow({
  row,
  index,
  cost,
  rollsPossible,
  lowStock,
  ingredient,
  unit,
  ingredientGroups,
  ingredientName,
  onUpdate,
  onRemove,
}: {
  row: BomRowData;
  index: number;
  cost: number;
  rollsPossible: number | null;
  lowStock: boolean;
  ingredient?: Ingredient;
  unit: string;
  ingredientGroups: IngredientGroup[];
  ingredientName: string;
  onUpdate: (index: number, field: keyof BomRowData, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <article className="bom-mobile-card">
      <div className="bom-mobile-card-header">
        <select
          value={row.ingredient_id}
          onChange={(event) =>
            onUpdate(index, "ingredient_id", event.target.value)
          }
          className="bom-mobile-select bom-mobile-select--header app-input"
          style={nativeSelectStyle}
          aria-label={ingredientName || "วัตถุดิบ"}
        >
          {ingredientGroups.map((optgroup) => (
            <optgroup key={optgroup.category} label={optgroup.label}>
              {optgroup.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          className="bom-mobile-card-delete"
          aria-label={`ลบ ${ingredientName}`}
          onClick={() => onRemove(index)}
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div className="bom-mobile-card-stats">
        <div className="bom-mobile-stat">
          <span className="bom-mobile-stat-label">ใช้/{YIELD_UNIT}</span>
          <div className="bom-mobile-qty-row">
            <NumberInput
              value={row.quantity_per_roll}
              onChange={(event) =>
                onUpdate(index, "quantity_per_roll", event.target.value)
              }
              className="bom-mobile-qty-input app-input-inline"
              aria-label={`${unit} ต่อ${YIELD_UNIT}`}
              allowDecimals
              decimals={2}
              plain
            />
            <span className="bom-mobile-qty-unit">{unit}</span>
          </div>
        </div>

        <div className="bom-mobile-stat bom-mobile-stat--stock">
          <span className="bom-mobile-stat-label">สต็อก</span>
          <span
            className="bom-mobile-stat-value tabular-nums"
            style={{
              color: ingredient ? stockDisplayColor(ingredient) : undefined,
            }}
          >
            {ingredient ? (
              <StockQuantityDisplay
                ingredient={ingredient}
                quantity={ingredient.current_stock}
              />
            ) : (
              "—"
            )}
          </span>
        </div>

        <div className="bom-mobile-stat bom-mobile-stat--cost">
          <span className="bom-mobile-stat-label">ต้นทุน</span>
          <span
            className="bom-mobile-stat-value tabular-nums"
            style={{ color: cost > 0 ? "var(--accent)" : undefined }}
          >
            {cost > 0 ? formatCurrency(cost) : "—"}
          </span>
        </div>

        <div className="bom-mobile-stat bom-mobile-stat--yield">
          <span className="bom-mobile-stat-label">ทำได้อีก</span>
          <span
            className="bom-mobile-stat-value tabular-nums"
            style={{ color: rollsYieldColor(rollsPossible, lowStock) }}
          >
            {rollsPossible !== null
              ? `${formatNumber(rollsPossible, 0)} ${YIELD_UNIT}`
              : "—"}
          </span>
        </div>
      </div>
    </article>
  );
}

export function BomMobileTotal({
  total,
  maxRolls,
}: {
  total: number;
  maxRolls: number;
}) {
  if (total <= 0 && maxRolls <= 0) return null;

  return (
    <article className="bom-mobile-card bom-mobile-card--total">
      <div className="bom-mobile-card-stats">
        <div className="bom-mobile-stat">
          <span className="bom-mobile-stat-label">รวม/{YIELD_UNIT}</span>
          <span
            className="bom-mobile-stat-value tabular-nums"
            style={{ color: total > 0 ? "var(--accent)" : undefined }}
          >
            {total > 0 ? formatCurrency(total) : "—"}
          </span>
        </div>
        <div className="bom-mobile-stat bom-mobile-stat--yield">
          <span className="bom-mobile-stat-label">ทำได้อีก</span>
          <span
            className="bom-mobile-stat-value tabular-nums"
            style={{ color: maxRolls > 0 ? "var(--success)" : undefined }}
          >
            {maxRolls > 0 ? `${formatNumber(maxRolls, 0)} ${YIELD_UNIT}` : "—"}
          </span>
        </div>
      </div>
    </article>
  );
}
