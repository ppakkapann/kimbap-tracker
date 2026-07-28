"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/calculations";
import {
  getCategoryBadgeStyle,
  getIngredientCategoryLabel,
} from "@/lib/ingredient-categories";
import { getInventoryStockStatus } from "@/lib/stock-analysis";
import type { Ingredient } from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";
import type { IngredientRowData } from "@/components/ingredients/IngredientSortableList";

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
    <span className="ingredient-category-badge" style={style}>
      {label}
    </span>
  );
}

function StockStatusBadge({ ingredient }: { ingredient: Ingredient }) {
  if (ingredient.low_stock_alert <= 0) return null;

  const status = getInventoryStockStatus(ingredient);
  const label =
    status === "out" ? "หมด" : status === "low" ? "ใกล้หมด" : "ปกติ";
  const badgeClass =
    status === "out"
      ? "app-badge-danger"
      : status === "low"
        ? "app-badge-warning"
        : "app-badge-success";

  return <span className={`app-badge ${badgeClass}`}>{label}</span>;
}

export function IngredientMobileCard({
  row,
  onEdit,
  allCategories,
  grip,
}: {
  row: IngredientRowData;
  onEdit: (id: string) => void;
  allCategories: string[];
  grip?: ReactNode;
}) {
  const { ingredient } = row;
  const unit = getIngredientUnitLabel(ingredient);

  return (
    <article className="ingredient-mobile-card">
      {grip ? <div className="ingredient-mobile-card-grip">{grip}</div> : null}
      <button
        type="button"
        className="ingredient-mobile-card-hit"
        onClick={() => onEdit(ingredient.id)}
      >
        <div className="ingredient-mobile-card-body">
          <div className="ingredient-mobile-card-top">
            <div className="ingredient-mobile-card-head">
              <LowStockDot low={row.low} />
              <p className="ingredient-mobile-card-title">{ingredient.name}</p>
            </div>
            <div
              className="ingredient-mobile-card-stock tabular-nums"
              style={{ color: row.low ? "var(--danger)" : "var(--text-primary)" }}
            >
              <StockQuantityDisplay
                ingredient={ingredient}
                quantity={ingredient.current_stock}
              />
            </div>
          </div>

          <div className="ingredient-mobile-card-tags">
            <CategoryBadge ingredient={ingredient} allCategories={allCategories} />
            <span className="ingredient-mobile-card-unit">{unit}</span>
            <StockStatusBadge ingredient={ingredient} />
          </div>

          <div className="ingredient-mobile-card-meta">
            <span>
              {row.unitCost > 0 ? formatCurrency(row.unitCost) : "—"}/หน่วย
            </span>
          </div>
        </div>
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="ingredient-mobile-card-chevron"
          aria-hidden
        />
      </button>
    </article>
  );
}
