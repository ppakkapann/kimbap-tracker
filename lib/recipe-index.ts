import type { Product, RecipeItem } from "@/lib/types";

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

export interface IngredientRecipeMenuLink {
  productId: string;
  productName: string;
  quantityPerRoll: number;
}

export function getIngredientRecipeMenus(
  ingredientId: string,
  products: Product[],
  recipeItems: RecipeItem[]
): IngredientRecipeMenuLink[] {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const seen = new Set<string>();
  const links: IngredientRecipeMenuLink[] = [];

  for (const item of recipeItems) {
    if (item.ingredient_id !== ingredientId) continue;
    if (seen.has(item.product_id)) continue;
    const product = productMap.get(item.product_id);
    if (!product) continue;
    seen.add(item.product_id);
    links.push({
      productId: product.id,
      productName: product.name,
      quantityPerRoll: item.quantity_per_roll,
    });
  }

  return links.sort((a, b) =>
    a.productName.localeCompare(b.productName, "th")
  );
}
