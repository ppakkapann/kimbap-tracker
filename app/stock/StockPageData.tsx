import { format, subDays } from "date-fns";
import { StockPageClient } from "./StockPageClient";
import { InventorySummaryBar } from "@/components/stock/InventorySummaryBar";
import { PageLoadingSkeleton } from "@/components/ui/PageLoading";
import { summarizeInventory } from "@/lib/stock-analysis";
import {
  fetchAllRecipeItems,
  fetchAllStockMovements,
  fetchIngredients,
  fetchProducts,
  fetchPurchases,
  fetchStockMovementsSince,
} from "@/lib/queries";

function parseStockTab(value: string | undefined): "overview" | "history" {
  if (value === "history") return "history";
  return "overview";
}

export function StockPageDataSkeleton() {
  return <PageLoadingSkeleton stats={0} cards={1} />;
}

export async function StockPageData({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const activeTab = parseStockTab(tab);

  const [ingredients, products, recipeItems, purchases, movements] =
    await Promise.all([
      fetchIngredients(),
      fetchProducts(),
      fetchAllRecipeItems(),
      fetchPurchases(),
      activeTab === "history"
        ? fetchAllStockMovements()
        : fetchStockMovementsSince(format(subDays(new Date(), 7), "yyyy-MM-dd")),
    ]);

  const inventorySummary = summarizeInventory(ingredients);

  return (
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
  );
}
