"use client";

import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { NumberInput } from "@/components/ui";
import { nativeSelectStyle } from "@/components/ui/native-controls";
import type { groupIngredientsForSelect } from "@/lib/ingredient-categories";
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
  unit,
  ingredientGroups,
  ingredientName,
  onUpdate,
  onRemove,
}: {
  row: BomRowData;
  index: number;
  cost: number;
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

        <div className="bom-mobile-stat bom-mobile-stat--cost">
          <span className="bom-mobile-stat-label">ต้นทุน</span>
          <span
            className="bom-mobile-stat-value tabular-nums"
            style={{ color: cost > 0 ? "var(--accent)" : undefined }}
          >
            {cost > 0 ? formatCurrency(cost) : "—"}
          </span>
        </div>
      </div>
    </article>
  );
}

export function BomMobileTotal({ total }: { total: number }) {
  if (total <= 0) return null;

  return (
    <article className="bom-mobile-card bom-mobile-card--total">
      <div className="bom-mobile-card-stats">
        <div className="bom-mobile-stat">
          <span className="bom-mobile-stat-label">รวม/{YIELD_UNIT}</span>
        </div>
        <div className="bom-mobile-stat bom-mobile-stat--cost">
          <span
            className="bom-mobile-stat-value tabular-nums"
            style={{ color: "var(--accent)" }}
          >
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </article>
  );
}
