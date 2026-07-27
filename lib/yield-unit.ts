import { perRowQuantityFromRecipe } from "./recipe-batch";
import type { RecipeItem } from "./types";

export const YIELD_UNIT = "ม้วน" as const;

export function rollsPossible(stock: number, quantityPerRoll: number): number {
  if (quantityPerRoll <= 0) return 0;
  return Math.floor(stock / quantityPerRoll);
}

export function rollsPossibleFromRecipe(
  stock: number,
  item: Pick<
    RecipeItem,
    "quantity_per_roll" | "batch_quantity" | "batch_yield"
  >
): number {
  const perRoll = perRowQuantityFromRecipe(item);
  return rollsPossible(stock, perRoll);
}
