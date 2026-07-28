"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StockControlPanel } from "@/components/stock/StockControlPanel";
import { AppModal } from "@/components/ui";
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

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="ตัดออก / ตรวจนับสต็อก"
        size="lg"
      >
        <StockControlPanel
          ingredients={ingredients}
          products={products}
          recipeItems={recipeItems}
          purchases={purchases}
          onSuccess={handleSuccess}
          embedded
        />
      </AppModal>
    </>
  );
}
