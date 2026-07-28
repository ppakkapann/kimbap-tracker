import { perRowQuantityFromRecipe } from "@/lib/recipe-batch";
import { isLowStock } from "@/lib/calculations";
import type { Ingredient, RecipeItem } from "@/lib/types";
import { rollsPossibleFromRecipe } from "@/lib/yield-unit";

export function recipeItemForBomRow(
  ingredientId: string,
  quantityPerRoll: number,
  existingItems: RecipeItem[]
): Pick<
  RecipeItem,
  "quantity_per_roll" | "batch_quantity" | "batch_yield"
> {
  const existing = existingItems.find(
    (item) => item.ingredient_id === ingredientId
  );
  if (
    existing?.batch_quantity &&
    existing.batch_quantity > 0 &&
    existing.batch_yield &&
    existing.batch_yield > 0
  ) {
    return existing;
  }
  return {
    quantity_per_roll: quantityPerRoll,
    batch_quantity: null,
    batch_yield: null,
  };
}

export function rollsPossibleForBomRow(
  ingredient: Ingredient | undefined,
  quantityPerRoll: number,
  existingItems: RecipeItem[],
  ingredientId: string
): number | null {
  if (!ingredient) return null;
  const item = recipeItemForBomRow(ingredientId, quantityPerRoll, existingItems);
  const perRoll = perRowQuantityFromRecipe(item);
  if (!(perRoll > 0)) return null;
  return rollsPossibleFromRecipe(ingredient.current_stock, item);
}

export function maxRollsFromBomRows(
  rows: Array<{ ingredientId: string; quantityPerRoll: number }>,
  ingredients: Ingredient[],
  existingItems: RecipeItem[]
): number {
  const values = rows
    .map(({ ingredientId, quantityPerRoll }) =>
      rollsPossibleForBomRow(
        ingredients.find((item) => item.id === ingredientId),
        quantityPerRoll,
        existingItems,
        ingredientId
      )
    )
    .filter((value): value is number => value !== null);

  return values.length > 0 ? Math.min(...values) : 0;
}

export function rollsYieldColor(
  rolls: number | null,
  lowStock: boolean
): string | undefined {
  if (rolls === null) return undefined;
  if (lowStock || rolls === 0) return "var(--danger)";
  if (rolls < 10) return "var(--warning)";
  return "var(--success)";
}

export function stockDisplayColor(ingredient: Ingredient): string | undefined {
  if (isLowStock(ingredient)) return "var(--danger)";
  return undefined;
}

export function isBomBottleneck(
  rollsPossible: number | null,
  maxRolls: number
): boolean {
  return (
    maxRolls > 0 &&
    rollsPossible !== null &&
    rollsPossible === maxRolls
  );
}
