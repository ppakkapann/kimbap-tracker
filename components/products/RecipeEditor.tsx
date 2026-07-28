"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveRecipeItems } from "@/lib/actions";
import { formatNumber, isLowStock } from "@/lib/calculations";
import { BomDesktopGrid } from "@/components/products/BomDesktopGrid";
import { BomMobileRow, BomMobileSummary } from "@/components/products/BomMobileRow";
import { BomRowEditModal } from "@/components/products/BomRowEditModal";
import { CostSortLabel } from "@/components/products/CostSortLabel";
import { unitCostFromPriceRef } from "@/lib/unit-cost";
import {
  getDistinctCategories,
  groupIngredientsForSelect,
} from "@/lib/ingredient-categories";
import {
  maxRollsFromBomRows,
  rollsPossibleForBomRow,
} from "@/lib/recipe-yield";
import {
  sortIndicesByCost,
  type RecipeCostSort,
} from "@/lib/recipe-cost-sort";
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
  const [costSort, setCostSort] = useState<RecipeCostSort>("desc");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  const sortedRowEntries = useMemo(() => {
    const costs = rows.map((row) => lineCost(row, ingredients));
    const indices = sortIndicesByCost(costs, costSort, (index) => {
      const ing = ingredients.find((item) => item.id === rows[index].ingredient_id);
      return ing?.name ?? "";
    });

    return indices.map((index) => ({
      row: rows[index],
      index,
      cost: costs[index],
      rollsPossible: rollsPossibleForBomRow(
        ingredients.find((item) => item.id === rows[index].ingredient_id),
        parseFloat(rows[index].quantity_per_roll),
        existingItems,
        rows[index].ingredient_id
      ),
    }));
  }, [rows, ingredients, costSort, existingItems]);

  const maxRolls = useMemo(
    () =>
      maxRollsFromBomRows(
        rows
          .map((row) => ({
            ingredientId: row.ingredient_id,
            quantityPerRoll: parseFloat(row.quantity_per_roll),
          }))
          .filter((row) => row.ingredientId && row.quantityPerRoll > 0),
        ingredients,
        existingItems
      ),
    [rows, ingredients, existingItems]
  );

  const editingEntry =
    editingIndex !== null ? sortedRowEntries.find((entry) => entry.index === editingIndex) : null;

  function addRow(category?: string) {
    const group = category
      ? ingredientGroups.find((item) => item.category === category)
      : ingredientGroups[0];
    const nextIndex = rows.length;
    setRows([
      ...rows,
      emptyRecipeRow(group?.items[0]?.id ?? ingredients[0]?.id ?? ""),
    ]);
    setEditingIndex(nextIndex);
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
    setEditingIndex(null);
  }

  function saveEditedRow(next: RecipeRow) {
    if (editingIndex === null) return;
    setRows((current) =>
      current.map((row, index) => (index === editingIndex ? next : row))
    );
    setEditingIndex(null);
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

  const mobileFeed = (
    <div className="bom-mobile-feed">
      <BomMobileSummary
        total={costBreakdown.total}
        maxRolls={maxRolls}
        itemCount={rows.length}
      />
      {sortedRowEntries.map(({ row, index, cost, rollsPossible }) => {
        const ing = ingredients.find((item) => item.id === row.ingredient_id);
        const unit = ing ? getIngredientUnitLabel(ing) : "";
        const low = ing ? isLowStock(ing) : false;

        return (
          <BomMobileRow
            key={`${row.ingredient_id}-${index}`}
            row={row}
            index={index}
            cost={cost}
            rollsPossible={rollsPossible}
            lowStock={low}
            ingredient={ing}
            unit={unit}
            allCategories={allCategories}
            onEdit={setEditingIndex}
          />
        );
      })}
    </div>
  );

  return (
    <div className="product-recipe-panel">
      <form onSubmit={handleSubmit} className="product-recipe-form">
        <div className="bom-toolbar">
          <div>
            <h2 className="app-section-title">สูตร (BOM)</h2>
            <p className="bom-toolbar-meta">
              {rows.length} รายการ · ต่อ {YIELD_UNIT}
              {maxRolls > 0 ? (
                <>
                  {" "}
                  · ทำได้อีก{" "}
                  <span style={{ color: "var(--success)" }}>
                    {formatNumber(maxRolls, 0)} {YIELD_UNIT}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          {rows.length > 0 ? (
            <CostSortLabel
              sort={costSort}
              onToggle={() =>
                setCostSort((current) => (current === "desc" ? "asc" : "desc"))
              }
              className="cost-sort-label--compact bom-toolbar-sort md:hidden"
            />
          ) : null}
        </div>

        <div className="product-recipe-table-shell">
          <div className="bom-sheet">
            {rows.length === 0 ? (
              <p className="bom-empty">ยังไม่มีรายการ — กด + ด้านล่างเพื่อเพิ่ม</p>
            ) : (
              <>
                <div className="hidden md:block max-md:!hidden bom-grid-shell">
                  <BomDesktopGrid
                    entries={sortedRowEntries}
                    ingredients={ingredients}
                    allCategories={allCategories}
                    costSort={costSort}
                    onCostSortToggle={() =>
                      setCostSort((current) =>
                        current === "desc" ? "asc" : "desc"
                      )
                    }
                    onEditRow={setEditingIndex}
                    total={costBreakdown.total}
                    maxRolls={maxRolls}
                  />
                </div>
                <div className="md:hidden">{mobileFeed}</div>
              </>
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

      {editingEntry ? (
        <BomRowEditModal
          open
          row={editingEntry.row}
          ingredients={ingredients}
          existingItems={existingItems}
          ingredientGroups={ingredientGroups}
          onClose={() => setEditingIndex(null)}
          onSave={saveEditedRow}
          onRemove={() => removeRow(editingEntry.index)}
        />
      ) : null}
    </div>
  );
}
