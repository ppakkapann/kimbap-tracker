"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatNumber, isLowStock } from "@/lib/calculations";
import { AppModal, NumberInput } from "@/components/ui";
import { nativeSelectStyle } from "@/components/ui/native-controls";
import type { groupIngredientsForSelect } from "@/lib/ingredient-categories";
import {
  rollsPossibleForBomRow,
  rollsYieldColor,
  stockDisplayColor,
} from "@/lib/recipe-yield";
import { unitCostFromPriceRef } from "@/lib/unit-cost";
import type { Ingredient, RecipeItem } from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";
import { YIELD_UNIT } from "@/lib/yield-unit";
import type { BomRowData } from "@/components/products/BomMobileRow";

type IngredientGroup = ReturnType<typeof groupIngredientsForSelect>[number];

function resolveIngredientUnitCost(ingredient: Ingredient): number {
  if (ingredient.avg_unit_cost > 0) return ingredient.avg_unit_cost;
  return unitCostFromPriceRef(ingredient);
}

export function BomRowEditModal({
  open,
  row,
  ingredients,
  existingItems,
  ingredientGroups,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  row: BomRowData;
  ingredients: Ingredient[];
  existingItems: RecipeItem[];
  ingredientGroups: IngredientGroup[];
  onClose: () => void;
  onSave: (next: BomRowData) => void;
  onRemove: () => void;
}) {
  const [ingredientId, setIngredientId] = useState(row.ingredient_id);
  const [quantityPerRoll, setQuantityPerRoll] = useState(row.quantity_per_roll);

  useEffect(() => {
    setIngredientId(row.ingredient_id);
    setQuantityPerRoll(row.quantity_per_roll);
  }, [row]);

  const selectedIngredient = ingredients.find((item) => item.id === ingredientId);
  const unit = selectedIngredient
    ? getIngredientUnitLabel(selectedIngredient)
    : "";
  const low = selectedIngredient ? isLowStock(selectedIngredient) : false;
  const qty = parseFloat(quantityPerRoll);
  const cost = useMemo(() => {
    if (!selectedIngredient || !(qty > 0)) return 0;
    const unitCost = resolveIngredientUnitCost(selectedIngredient);
    return unitCost > 0 ? qty * unitCost : 0;
  }, [selectedIngredient, qty]);
  const rollsPossible = useMemo(
    () =>
      rollsPossibleForBomRow(
        selectedIngredient,
        qty,
        existingItems,
        ingredientId
      ),
    [selectedIngredient, qty, existingItems, ingredientId]
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const qty = parseFloat(quantityPerRoll);
    if (!ingredientId) return;
    if (!(qty > 0)) return;
    onSave({ ingredient_id: ingredientId, quantity_per_roll: quantityPerRoll });
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="แก้ไขสูตร"
      subtitle={selectedIngredient?.name}
      size="sm"
      footer={
        <div className="bom-row-edit-foot">
          <button
            type="button"
            className="bom-row-edit-remove"
            onClick={() => {
              onRemove();
              onClose();
            }}
          >
            ลบออกจากสูตร
          </button>
          <div className="bom-row-edit-actions">
            <button
              type="button"
              className="app-btn app-btn-secondary"
              onClick={onClose}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="bom-row-edit-form"
              className="app-btn app-btn-primary"
              disabled={!ingredientId || !(parseFloat(quantityPerRoll) > 0)}
            >
              ตกลง
            </button>
          </div>
        </div>
      }
    >
      <form id="bom-row-edit-form" onSubmit={handleSubmit} className="bom-row-edit-form">
        <label className="ingredient-edit-field">
          <span className="app-label">วัตถุดิบ</span>
          <select
            value={ingredientId}
            onChange={(event) => setIngredientId(event.target.value)}
            className="app-input"
            style={nativeSelectStyle}
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
        </label>

        <label className="ingredient-edit-field">
          <span className="app-label">ใช้ต่อ{YIELD_UNIT}</span>
          <div className="ingredient-edit-unit-input">
            <NumberInput
              className="min-w-0 flex-1"
              value={quantityPerRoll}
              placeholder="75"
              onChange={(event) => setQuantityPerRoll(event.target.value)}
              allowDecimals
              decimals={2}
            />
            <span className="ingredient-edit-unit-suffix">{unit}</span>
          </div>
        </label>

        {selectedIngredient ? (
          <div className="bom-row-edit-meta">
            <div className="bom-row-edit-meta-item">
              <span className="bom-row-edit-meta-label">สต็อก</span>
              <span
                className="bom-row-edit-meta-value tabular-nums"
                style={{ color: stockDisplayColor(selectedIngredient) }}
              >
                <StockQuantityDisplay
                  ingredient={selectedIngredient}
                  quantity={selectedIngredient.current_stock}
                />
              </span>
            </div>
            <div className="bom-row-edit-meta-item">
              <span className="bom-row-edit-meta-label">ต้นทุน/{YIELD_UNIT}</span>
              <span className="bom-row-edit-meta-value tabular-nums">
                {cost > 0 ? formatCurrency(cost) : "—"}
              </span>
            </div>
            <div className="bom-row-edit-meta-item">
              <span className="bom-row-edit-meta-label">ทำได้อีก</span>
              <span
                className="bom-row-edit-meta-value tabular-nums"
                style={{ color: rollsYieldColor(rollsPossible, low) }}
              >
                {rollsPossible !== null
                  ? `${formatNumber(rollsPossible, 0)} ${YIELD_UNIT}`
                  : "—"}
              </span>
            </div>
          </div>
        ) : null}
      </form>
    </AppModal>
  );
}
