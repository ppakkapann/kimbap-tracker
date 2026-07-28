"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import { CostSortLabel } from "@/components/products/CostSortLabel";
import { ProductsMobileCard } from "@/components/products/ProductsMobileCard";
import { formatCurrency } from "@/lib/calculations";
import { sortByRecipeCost, type RecipeCostSort } from "@/lib/recipe-cost-sort";
import type { ProductWithCost } from "@/lib/types";

function toggleCostSort(sort: RecipeCostSort): RecipeCostSort {
  return sort === "desc" ? "asc" : "desc";
}

export function ProductsGridView({ products }: { products: ProductWithCost[] }) {
  const [costSort, setCostSort] = useState<RecipeCostSort>("desc");

  const productsWithSortedRecipes = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        recipeItems: sortByRecipeCost(
          product.recipeItems,
          (item) => item.costPerRoll,
          (item) => item.ingredient?.name ?? "",
          costSort
        ),
      })),
    [products, costSort]
  );

  return (
    <>
      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
        {productsWithSortedRecipes.map((p) => (
          <div key={p.id} className="app-card-interactive flex flex-col">
            <Link href={`/products/${p.id}`} className="block min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    {!p.is_active && <Badge>ปิดขาย</Badge>}
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    ขาย {formatCurrency(p.selling_price)}/ม้วน
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p style={{ color: "var(--text-muted)" }}>
                    ต้นทุน {formatCurrency(p.costPerRoll)}
                  </p>
                  <p
                    className="font-semibold"
                    style={{
                      color: p.profitPerRoll >= 0 ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    กำไร {formatCurrency(p.profitPerRoll)}
                  </p>
                </div>
              </div>
            </Link>

            {p.recipeItems.length > 0 && (
              <div
                className="mt-3 space-y-1.5 pt-3"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-[11px] font-medium uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ต้นทุนแยกรายการ
                  </p>
                  <CostSortLabel
                    sort={costSort}
                    onToggle={() => setCostSort(toggleCostSort)}
                    className="cost-sort-label--compact"
                  />
                </div>
                <div className="space-y-1.5">
                  {p.recipeItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-3 text-xs leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span className="truncate">
                        {item.ingredient?.name || "วัตถุดิบ"}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatCurrency(item.costPerRoll)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="products-mobile-feed md:hidden">
        {productsWithSortedRecipes.map((product) => (
          <ProductsMobileCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
