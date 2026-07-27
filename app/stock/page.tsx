import { Suspense } from "react";
import { StockPageClient } from "./StockPageClient";
import { KimbapMark } from "@/components/brand/KimbapMark";
import { InventorySummaryBar } from "@/components/stock/InventorySummaryBar";
import { summarizeInventory } from "@/lib/stock-analysis";
import {
  fetchAllRecipeItems,
  fetchAllStockMovements,
  fetchIngredients,
  fetchProducts,
  fetchPurchases,
} from "@/lib/queries";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const [ingredients, products, recipeItems, movements, purchases] =
    await Promise.all([
      fetchIngredients(),
      fetchProducts(),
      fetchAllRecipeItems(),
      fetchAllStockMovements(),
      fetchPurchases(),
    ]);

  const inventorySummary = summarizeInventory(ingredients);

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <div className="hidden md:block">
          <KimbapMark size={44} />
        </div>
        <div>
          <h1 className="app-title">สต็อก</h1>
          <p className="app-subtitle mt-1">
            สต็อกและวัตถุดิบ · {ingredients.length} รายการ
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <StockPageClient
          overviewSummary={<InventorySummaryBar summary={inventorySummary} />}
          ingredients={ingredients}
          products={products}
          recipeItems={recipeItems}
          movements={movements}
          purchases={purchases}
          initialTab={tab}
          initialSearch={q}
          today={today}
        />
      </Suspense>
    </div>
  );
}
