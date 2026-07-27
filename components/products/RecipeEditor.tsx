"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveRecipeItems } from "@/lib/actions";
import { formatCurrency } from "@/lib/calculations";
import { NumberInput } from "@/components/ui";
import { nativeSelectStyle } from "@/components/ui/native-controls";
import { unitCostFromPriceRef } from "@/lib/unit-cost";
import {
  getCategoryFilterStyle,
  getDistinctCategories,
  groupIngredientsForSelect,
  normalizeIngredientCategory,
} from "@/lib/ingredient-categories";
import type { Ingredient, RecipeItem } from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";
import { YIELD_UNIT } from "@/lib/yield-unit";

interface RecipeRow {
  ingredient_id: string;
  quantity_per_roll: string;
}

function resolveIngredientUnitCost(ingredient: Ingredient): number {
  if (ingredient.avg_unit_cost > 0) return ingredient.avg_unit_cost;
  return unitCostFromPriceRef(ingredient);
}

function lineCost(row: RecipeRow, ingredients: Ingredient[]): number {
  const ing = ingredients.find((item) => item.id === row.ingredient_id);
  const qty = parseFloat(row.quantity_per_roll);
  if (!ing || !(qty > 0)) return 0;
  const unitCost = resolveIngredientUnitCost(ing);
  return unitCost > 0 ? qty * unitCost : 0;
}

function recipeRowFromItem(item: RecipeItem): RecipeRow {
  return {
    ingredient_id: item.ingredient_id,
    quantity_per_roll: String(item.quantity_per_roll),
  };
}

function emptyRecipeRow(ingredientId: string): RecipeRow {
  return { ingredient_id: ingredientId, quantity_per_roll: "" };
}

export function RecipeEditor({
  productId,
  ingredients,
  existingItems,
}: {
  productId: string;
  ingredients: Ingredient[];
  existingItems: RecipeItem[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RecipeRow[]>(
    existingItems.length > 0 ? existingItems.map(recipeRowFromItem) : []
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const ingredientGroups = useMemo(
    () => groupIngredientsForSelect(ingredients),
    [ingredients]
  );

  const allCategories = useMemo(
    () => getDistinctCategories(ingredients),
    [ingredients]
  );

  const costBreakdown = useMemo(() => {
    let total = 0;

    for (const row of rows) {
      total += lineCost(row, ingredients);
    }

    return { total };
  }, [rows, ingredients]);

  const rowGroups = useMemo(
    () =>
      ingredientGroups
        .map((group) => {
          const entries = rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => {
              const ing = ingredients.find((item) => item.id === row.ingredient_id);
              return (
                ing &&
                normalizeIngredientCategory(ing.category) === group.category
              );
            });

          const subtotal = entries.reduce(
            (sum, { row }) => sum + lineCost(row, ingredients),
            0
          );

          return { ...group, entries, subtotal };
        })
        .filter((group) => group.entries.length > 0),
    [rows, ingredients, ingredientGroups]
  );

  function addRow(category?: string) {
    const group = category
      ? ingredientGroups.find((item) => item.category === category)
      : ingredientGroups[0];
    setRows([
      ...rows,
      emptyRecipeRow(group?.items[0]?.id ?? ingredients[0]?.id ?? ""),
    ]);
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof RecipeRow, value: string) {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const items = rows
      .map((row) => {
        const quantityPerRoll = parseFloat(row.quantity_per_roll);
        if (!row.ingredient_id || !(quantityPerRoll > 0)) return null;
        return {
          ingredient_id: row.ingredient_id,
          quantity_per_roll: quantityPerRoll,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const result = await saveRecipeItems(productId, items);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  if (ingredients.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        เพิ่มวัตถุดิบก่อนกำหนดสูตร
      </p>
    );
  }

  return (
    <div className="product-recipe-panel">
      <form onSubmit={handleSubmit} className="product-recipe-form">
        <div className="bom-toolbar">
          <div>
            <h2 className="app-section-title">สูตร (BOM)</h2>
            <p className="bom-toolbar-meta">
              {rows.length} รายการ · ต่อ {YIELD_UNIT}
            </p>
          </div>
          {costBreakdown.total > 0 && (
            <p className="bom-toolbar-total">
              รวม{" "}
              <strong>{formatCurrency(costBreakdown.total)}</strong>/{YIELD_UNIT}
            </p>
          )}
        </div>

        <div className="product-recipe-table-shell">
          <div className="bom-sheet">
          {rows.length === 0 ? (
            <p className="bom-empty">ยังไม่มีรายการ — กด + ด้านล่างเพื่อเพิ่ม</p>
          ) : (
            <table className="bom-table">
              <thead>
                <tr>
                  <th>วัตถุดิบ</th>
                  <th>ใช้/{YIELD_UNIT}</th>
                  <th>ต้นทุน</th>
                  <th aria-label="ลบ" />
                </tr>
              </thead>
              <tbody>
                {rowGroups.map((group) => {
                  const pillStyle = getCategoryFilterStyle(
                    group.label,
                    allCategories,
                    true
                  );

                  return (
                  <Fragment key={group.category}>
                    <tr className="bom-section-row">
                      <td colSpan={2} className="bom-section-pill-cell">
                        <span
                          className="bom-category-pill"
                          style={{
                            color: pillStyle.color,
                            background: pillStyle.background,
                            borderColor: pillStyle.borderColor,
                          }}
                        >
                          {group.label}
                        </span>
                      </td>
                      <td className="bom-cell-cost bom-section-subtotal">
                        {group.subtotal > 0
                          ? formatCurrency(group.subtotal)
                          : "—"}
                      </td>
                      <td className="bom-cell-action" />
                    </tr>
                    {group.entries.map(({ row, index }) => {
                      const ing = ingredients.find(
                        (item) => item.id === row.ingredient_id
                      );
                      const unit = ing ? getIngredientUnitLabel(ing) : "";
                      const cost = lineCost(row, ingredients);

                      return (
                        <tr key={`${group.category}-${index}`}>
                          <td className="bom-cell-ingredient">
                            <select
                              value={row.ingredient_id}
                              onChange={(e) =>
                                updateRow(
                                  index,
                                  "ingredient_id",
                                  e.target.value
                                )
                              }
                              className="bom-select app-input"
                              style={nativeSelectStyle}
                              aria-label={ing?.name ?? "วัตถุดิบ"}
                            >
                              {ingredientGroups.map((optgroup) => (
                                <optgroup
                                  key={optgroup.category}
                                  label={optgroup.label}
                                >
                                  {optgroup.items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                          <td className="bom-cell-qty">
                            <NumberInput
                              value={row.quantity_per_roll}
                              onChange={(e) =>
                                updateRow(
                                  index,
                                  "quantity_per_roll",
                                  e.target.value
                                )
                              }
                              className="bom-qty-input app-input-inline"
                              aria-label={`${unit} ต่อ${YIELD_UNIT}`}
                              allowDecimals
                              decimals={2}
                              plain
                            />
                            <span className="bom-qty-unit">{unit}</span>
                          </td>
                          <td className="bom-cell-cost">
                            {cost > 0 ? formatCurrency(cost) : "—"}
                          </td>
                          <td className="bom-cell-action">
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="bom-remove"
                              aria-label="ลบ"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                  );
                })}
              </tbody>
              {costBreakdown.total > 0 && (
                <tfoot>
                  <tr className="bom-foot-total">
                    <td colSpan={2}>รวม/{YIELD_UNIT}</td>
                    <td>{formatCurrency(costBreakdown.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
          </div>
        </div>

        <div className="bom-footer">
          <div className="bom-add-buttons">
            {ingredientGroups.map((group) => (
              <button
                key={group.category}
                type="button"
                onClick={() => addRow(group.category)}
                className="bom-add-btn"
              >
                + {group.label}
              </button>
            ))}
          </div>

          <div className="bom-footer-actions">
            {error && <p className="bom-message bom-message--error">{error}</p>}
            {success && (
              <p className="bom-message bom-message--success">บันทึกแล้ว</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="app-btn app-btn-primary"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกสูตร"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
