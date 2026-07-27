import { usageQuantityFromRecipe } from "@/lib/recipe-batch";
import type { RecipeItem } from "@/lib/types";

export type SaleStockContext = {
  getStock: (ingredientId: string) => number | undefined;
  getIngredientName: (ingredientId: string) => string;
  getRecipeItems: (productId: string) => RecipeItem[];
  getProductName?: (productId: string) => string;
};

export function validateRecipeStockForSale(
  recipeItems: RecipeItem[],
  rollQuantity: number,
  ctx: Pick<SaleStockContext, "getStock" | "getIngredientName">
): string | null {
  if (recipeItems.length === 0) {
    return "เมนูนี้ยังไม่มีสูตรวัตถุดิบ";
  }

  for (const item of recipeItems) {
    const required = usageQuantityFromRecipe(item, rollQuantity);
    const available = ctx.getStock(item.ingredient_id);
    if (available === undefined) {
      return `${ctx.getIngredientName(item.ingredient_id)} ไม่พบในสต็อก`;
    }
    if (required > available) {
      return `${ctx.getIngredientName(item.ingredient_id)} มีไม่พอ (ต้องใช้ ${required})`;
    }
  }

  return null;
}

/** Validate an entire cart; simulates sequential stock deduction across line items. */
export function validateSaleBatchStock(
  items: { product_id: string; quantity: number }[],
  ctx: SaleStockContext
): string | null {
  const simulated = new Map<string, number>();

  for (const item of items) {
    const recipeItems = ctx.getRecipeItems(item.product_id);
    if (recipeItems.length === 0) {
      const name = ctx.getProductName?.(item.product_id) ?? "เมนู";
      return `${name} ยังไม่มีสูตรวัตถุดิบ`;
    }

    for (const recipe of recipeItems) {
      const required = usageQuantityFromRecipe(recipe, item.quantity);
      let available = simulated.get(recipe.ingredient_id);
      if (available === undefined) {
        available = ctx.getStock(recipe.ingredient_id);
      }
      if (available === undefined) {
        return `${ctx.getIngredientName(recipe.ingredient_id)} ไม่พบในสต็อก`;
      }
      if (required > available) {
        return `${ctx.getIngredientName(recipe.ingredient_id)} มีไม่พอ (ต้องใช้ ${required})`;
      }
      simulated.set(recipe.ingredient_id, available - required);
    }
  }

  return null;
}
