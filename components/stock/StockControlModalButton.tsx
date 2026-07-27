"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StockControlPanel } from "@/components/stock/StockControlPanel";
import type { Ingredient, Product, Purchase, RecipeItem } from "@/lib/types";

export function StockControlModalButton({
  ingredients,
  products,
  recipeItems,
  purchases,
}: {
  ingredients: Ingredient[];
  products: Product[];
  recipeItems: RecipeItem[];
  purchases: Purchase[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-btn app-btn-secondary app-btn-sm shrink-0"
      >
        − ตัดออก / นับ
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 sm:p-6"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="app-section-title text-lg">
                ตัดออก / ตรวจนับสต็อก
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xl leading-none"
                style={{ color: "var(--text-muted)" }}
                aria-label="ปิด"
              >
                ×
              </button>
            </div>

            <StockControlPanel
              ingredients={ingredients}
              products={products}
              recipeItems={recipeItems}
              purchases={purchases}
              onSuccess={handleSuccess}
              embedded
            />
          </div>
        </div>
      )}
    </>
  );
}
