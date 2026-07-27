import type { RecipeItem } from "@/lib/types";

export function recipeItemsByProduct(
  items: RecipeItem[]
): Map<string, RecipeItem[]> {
  const map = new Map<string, RecipeItem[]>();
  for (const item of items) {
    const list = map.get(item.product_id);
    if (list) list.push(item);
    else map.set(item.product_id, [item]);
  }
  return map;
}
