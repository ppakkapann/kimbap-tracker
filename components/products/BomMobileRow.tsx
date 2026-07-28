"use client";

import { ChevronRight } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import {
  getCategoryBadgeStyle,
  getIngredientCategoryLabel,
} from "@/lib/ingredient-categories";
import { rollsYieldColor, stockDisplayColor } from "@/lib/recipe-yield";
import type { Ingredient } from "@/lib/types";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";
import { YIELD_UNIT } from "@/lib/yield-unit";

export interface BomRowData {
  ingredient_id: string;
  quantity_per_roll: string;
}

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
}: {
  ingredient: Ingredient;
  allCategories: string[];
}) {
  const label = getIngredientCategoryLabel(ingredient.category);
  const style = getCategoryBadgeStyle(label, allCategories);
  return (
    <span className="ingredient-category-badge bom-mobile-pill" style={style}>
      {label}
    </span>
  );
}

export function BomMobileRow({
  row,
  index,
  cost,
  rollsPossible,
  lowStock,
  ingredient,
  unit,
  allCategories,
  onEdit,
}: {
  row: BomRowData;
  index: number;
  cost: number;
  rollsPossible: number | null;
  lowStock: boolean;
  ingredient?: Ingredient;
  unit: string;
  allCategories: string[];
  onEdit: (index: number) => void;
}) {
  const qty = parseFloat(row.quantity_per_roll);
  const name = ingredient?.name ?? "—";

  return (
    <article className="bom-mobile-card">
      <button
        type="button"
        className="bom-mobile-card-hit"
        onClick={() => onEdit(index)}
        aria-label={`แก้ไข ${name}`}
      >
        <div className="bom-mobile-card-body">
          <div className="bom-mobile-card-top">
            <div className="bom-mobile-card-head">
              <LowStockDot low={lowStock} />
              <p className="bom-mobile-card-title">{name}</p>
              {ingredient ? (
                <CategoryBadge
                  ingredient={ingredient}
                  allCategories={allCategories}
                />
              ) : null}
            </div>
            <div className="bom-mobile-card-qty tabular-nums">
              {qty > 0 ? (
                <>
                  <span className="bom-mobile-card-qty-value">
                    {formatNumber(qty, 2)}
                  </span>
                  <span className="bom-mobile-card-qty-unit">{unit}</span>
                </>
              ) : (
                <span className="bom-mobile-card-qty-empty">—</span>
              )}
            </div>
          </div>

          <div className="bom-mobile-card-meta">
            <span className="bom-mobile-meta-item">
              <span className="bom-mobile-meta-label">สต็อก</span>
              <span
                className="bom-mobile-meta-value tabular-nums"
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
            </span>
            <span className="bom-mobile-meta-dot" aria-hidden>
              ·
            </span>
            <span className="bom-mobile-meta-item">
              <span className="bom-mobile-meta-label">ต้นทุน</span>
              <span
                className="bom-mobile-meta-value tabular-nums"
                style={{ color: cost > 0 ? "var(--accent)" : undefined }}
              >
                {cost > 0 ? formatCurrency(cost) : "—"}
              </span>
            </span>
            <span className="bom-mobile-meta-dot" aria-hidden>
              ·
            </span>
            <span className="bom-mobile-meta-item">
              <span className="bom-mobile-meta-label">ทำได้</span>
              <span
                className="bom-mobile-meta-value tabular-nums"
                style={{ color: rollsYieldColor(rollsPossible, lowStock) }}
              >
                {rollsPossible !== null
                  ? `${formatNumber(rollsPossible, 0)} ${YIELD_UNIT}`
                  : "—"}
              </span>
            </span>
          </div>
        </div>
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="bom-mobile-card-chevron"
          aria-hidden
        />
      </button>
    </article>
  );
}

export function BomMobileSummary({
  total,
  maxRolls,
  itemCount,
}: {
  total: number;
  maxRolls: number;
  itemCount: number;
}) {
  if (itemCount === 0) return null;

  return (
    <div className="bom-mobile-summary">
      <div className="bom-mobile-summary-stat">
        <span className="bom-mobile-summary-label">ต้นทุน/{YIELD_UNIT}</span>
        <span
          className="bom-mobile-summary-value tabular-nums"
          style={{ color: total > 0 ? "var(--accent)" : undefined }}
        >
          {total > 0 ? formatCurrency(total) : "—"}
        </span>
      </div>
      <div className="bom-mobile-summary-divider" aria-hidden />
      <div className="bom-mobile-summary-stat">
        <span className="bom-mobile-summary-label">ทำได้อีก</span>
        <span
          className="bom-mobile-summary-value tabular-nums"
          style={{ color: maxRolls > 0 ? "var(--success)" : undefined }}
        >
          {maxRolls > 0 ? `${formatNumber(maxRolls, 0)} ${YIELD_UNIT}` : "—"}
        </span>
      </div>
    </div>
  );
}
