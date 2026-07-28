"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/calculations";
import {
  calculateFoodCostPercent,
  getFoodCostStatus,
  getFoodCostStatusColor,
  getFoodCostStatusLabel,
  getProductCostTargets,
} from "@/lib/food-cost";
import type { ProductWithCost } from "@/lib/types";

export function ProductsMobileCard({ product }: { product: ProductWithCost }) {
  const targets = getProductCostTargets(product);
  const hasCost = product.costPerRoll > 0 && product.selling_price > 0;
  const fcPercent = calculateFoodCostPercent(
    product.costPerRoll,
    product.selling_price
  );
  const fcStatus = getFoodCostStatus(fcPercent, targets.min, targets.max);
  const fcColor = getFoodCostStatusColor(fcStatus);
  const fcLabel = getFoodCostStatusLabel(fcStatus);
  const ingredientCount = product.recipeItems.length;

  return (
    <Link href={`/products/${product.id}`} className="products-mobile-card">
      <div className="products-mobile-card-body">
        <div className="products-mobile-card-top">
          <div className="products-mobile-card-head">
            <p className="products-mobile-card-title">{product.name}</p>
            {!product.is_active ? <Badge>ปิดขาย</Badge> : null}
          </div>
          <ChevronRight
            size={18}
            strokeWidth={1.75}
            className="products-mobile-card-chevron"
            aria-hidden
          />
        </div>

        <p className="products-mobile-card-price tabular-nums">
          ขาย {formatCurrency(product.selling_price)}/ม้วน
        </p>

        <div className="products-mobile-card-stats">
          <div className="products-mobile-stat">
            <span className="products-mobile-stat-label">ต้นทุน</span>
            <span className="products-mobile-stat-value tabular-nums">
              {formatCurrency(product.costPerRoll)}
            </span>
          </div>
          <div className="products-mobile-stat">
            <span className="products-mobile-stat-label">กำไร</span>
            <span
              className="products-mobile-stat-value tabular-nums"
              style={{
                color:
                  product.profitPerRoll >= 0
                    ? "var(--success)"
                    : "var(--danger)",
              }}
            >
              {formatCurrency(product.profitPerRoll)}
            </span>
          </div>
          <div className="products-mobile-stat">
            <span className="products-mobile-stat-label">Food Cost</span>
            <span
              className="products-mobile-stat-value tabular-nums"
              style={{ color: hasCost ? fcColor : undefined }}
            >
              {hasCost ? `${fcPercent.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>

        {(hasCost || ingredientCount > 0) && (
          <div className="products-mobile-card-meta">
            {hasCost ? (
              <span
                className="products-mobile-fc-badge"
                style={{
                  color: fcColor,
                  borderColor: `color-mix(in srgb, ${fcColor} 35%, var(--border-subtle))`,
                  background: `color-mix(in srgb, ${fcColor} 12%, transparent)`,
                }}
              >
                {fcLabel}
              </span>
            ) : null}
            {ingredientCount > 0 ? (
              <span className="products-mobile-recipe-count">
                {ingredientCount} วัตถุดิบในสูตร
              </span>
            ) : null}
          </div>
        )}
      </div>
    </Link>
  );
}
