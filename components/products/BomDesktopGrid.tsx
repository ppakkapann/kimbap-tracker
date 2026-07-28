"use client";

import { formatCurrency, formatNumber, isLowStock } from "@/lib/calculations";
import {
  getCategoryBadgeStyle,
  getIngredientCategoryLabel,
} from "@/lib/ingredient-categories";
import { rollsYieldColor, stockDisplayColor } from "@/lib/recipe-yield";
import type { RecipeCostSort } from "@/lib/recipe-cost-sort";
import type { Ingredient } from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";
import { CostSortLabel } from "@/components/products/CostSortLabel";
import type { BomRowData } from "@/components/products/BomMobileRow";
import { YIELD_UNIT } from "@/lib/yield-unit";

function LowStockDot({ low }: { low: boolean }) {
  if (!low) return null;
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: "var(--danger)" }}
    />
  );
}

function CategoryBadge({
  ingredient,
  allCategories,
  className = "",
}: {
  ingredient: Ingredient;
  allCategories: string[];
  className?: string;
}) {
  const label = getIngredientCategoryLabel(ingredient.category);
  const style = getCategoryBadgeStyle(label, allCategories);
  return (
    <span
      className={`ingredient-category-badge ${className}`.trim()}
      style={style}
    >
      {label}
    </span>
  );
}

function BomGridHead({
  entriesCount,
  costSort,
  onCostSortToggle,
}: {
  entriesCount: number;
  costSort: RecipeCostSort;
  onCostSortToggle: () => void;
}) {
  return (
    <div className="ingredient-grid-head ingredient-grid-head--bom">
      <div className="ingredient-grid-cell ingredient-grid-cell--name">
        วัตถุดิบ
      </div>
      <span className="ingredient-grid-cell ingredient-grid-cell--qty">
        ใช้/{YIELD_UNIT}
      </span>
      <span className="ingredient-grid-cell ingredient-grid-cell--stock">
        สต็อก
      </span>
      <span className="ingredient-grid-cell ingredient-grid-cell--cost">
        {entriesCount > 0 ? (
          <CostSortLabel
            sort={costSort}
            onToggle={onCostSortToggle}
            className="cost-sort-label--th"
          />
        ) : (
          "ต้นทุน"
        )}
      </span>
      <span className="ingredient-grid-cell ingredient-grid-cell--yield">
        ทำได้อีก
      </span>
    </div>
  );
}

export function BomDesktopGrid({
  entries,
  ingredients,
  allCategories,
  costSort,
  onCostSortToggle,
  onEditRow,
  total,
  maxRolls,
}: {
  entries: {
    row: BomRowData;
    index: number;
    cost: number;
    rollsPossible: number | null;
  }[];
  ingredients: Ingredient[];
  allCategories: string[];
  costSort: RecipeCostSort;
  onCostSortToggle: () => void;
  onEditRow: (index: number) => void;
  total: number;
  maxRolls: number;
}) {
  return (
    <div className="bom-grid-table ingredient-grid-list--bom">
      <div className="bom-grid-scroll">
        <div className="ingredient-grid-list ingredient-grid-list--bom bom-grid-body">
          <BomGridHead
            entriesCount={entries.length}
            costSort={costSort}
            onCostSortToggle={onCostSortToggle}
          />
      {entries.map(({ row, index, cost, rollsPossible }) => {
        const ing = ingredients.find((item) => item.id === row.ingredient_id);
        const unit = ing ? getIngredientUnitLabel(ing) : "";
        const low = ing ? isLowStock(ing) : false;
        const qty = parseFloat(row.quantity_per_roll);

        return (
          <div
            key={`${row.ingredient_id}-${index}`}
            role="button"
            tabIndex={0}
            className="ingredient-grid-row"
            onClick={() => onEditRow(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onEditRow(index);
            }}
          >
            <div className="ingredient-grid-cell ingredient-grid-cell--name">
              <div className="bom-grid-name-line">
                <LowStockDot low={low} />
                <span className="bom-grid-name-text">{ing?.name ?? "—"}</span>
                {ing ? (
                  <CategoryBadge
                    ingredient={ing}
                    allCategories={allCategories}
                    className="bom-grid-name-pill"
                  />
                ) : null}
              </div>
            </div>
            <div className="ingredient-grid-cell ingredient-grid-cell--qty">
              <div className="bom-grid-qty">
                <span className="cell-numeric text-sm">
                  {qty > 0 ? formatNumber(qty, 2) : "—"}
                </span>
                {unit ? (
                  <span className="bom-grid-qty-unit">{unit}</span>
                ) : null}
              </div>
            </div>
            <div className="ingredient-grid-cell ingredient-grid-cell--stock">
              <span
                className="cell-numeric text-sm leading-snug"
                style={{ color: ing ? stockDisplayColor(ing) : undefined }}
              >
                {ing ? (
                  <StockQuantityDisplay
                    ingredient={ing}
                    quantity={ing.current_stock}
                  />
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="ingredient-grid-cell ingredient-grid-cell--cost">
              <span
                className="cell-numeric text-sm"
                style={{ color: cost > 0 ? "var(--accent)" : undefined }}
              >
                {cost > 0 ? formatCurrency(cost) : "—"}
              </span>
            </div>
            <div className="ingredient-grid-cell ingredient-grid-cell--yield">
              <span
                className="cell-numeric bom-grid-yield text-sm"
                style={{ color: rollsYieldColor(rollsPossible, low) }}
              >
                {rollsPossible !== null ? (
                  <>
                    {formatNumber(rollsPossible, 0)}
                    <span className="bom-grid-yield-unit">{YIELD_UNIT}</span>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
        );
      })}

      {total > 0 ? (
        <div className="ingredient-grid-row ingredient-grid-row--total">
          <div className="ingredient-grid-cell ingredient-grid-cell--name">
            <span className="font-semibold">รวม/{YIELD_UNIT}</span>
          </div>
          <div className="ingredient-grid-cell ingredient-grid-cell--qty" />
          <div className="ingredient-grid-cell ingredient-grid-cell--stock" />
          <div className="ingredient-grid-cell ingredient-grid-cell--cost">
            <span
              className="cell-numeric font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {formatCurrency(total)}
            </span>
          </div>
          <div className="ingredient-grid-cell ingredient-grid-cell--yield">
            <span
              className="cell-numeric bom-grid-yield font-semibold"
              style={{ color: maxRolls > 0 ? "var(--success)" : undefined }}
            >
              {maxRolls > 0 ? (
                <>
                  {formatNumber(maxRolls, 0)}
                  <span className="bom-grid-yield-unit">{YIELD_UNIT}</span>
                </>
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>
      ) : null}
        </div>
      </div>
    </div>
  );
}
