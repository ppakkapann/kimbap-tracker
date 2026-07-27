import type {
  Ingredient,
  Product,
  Purchase,
  RecipeItem,
  StockMovement,
} from "./types";
import { getUnitCost } from "./calculations";

export interface ProductYield {
  productId: string;
  productName: string;
  qtyPerRoll: number;
  rollsPossible: number;
}

export interface IngredientStockDetail {
  ingredient: Ingredient;
  unitCost: number;
  productYields: ProductYield[];
  minRollsPossible: number | null;
  todayUsage: number;
  weekUsage: number;
  isLow: boolean;
}

export interface ProductCapacity {
  productId: string;
  productName: string;
  sellingPrice: number;
  maxRolls: number;
  limitingIngredientId: string | null;
  limitingIngredientName: string | null;
}

export interface StockPageAnalysis {
  ingredientDetails: IngredientStockDetail[];
  productCapacities: ProductCapacity[];
  maxStockForBar: number;
  globalMaxRolls: number;
  lowStockCount: number;
}

export type InventoryStockStatus = "ok" | "low" | "out";

export function getInventoryStockStatus(
  ingredient: Ingredient
): InventoryStockStatus {
  if (ingredient.current_stock <= 0) return "out";
  if (
    ingredient.low_stock_alert > 0 &&
    ingredient.current_stock <= ingredient.low_stock_alert
  ) {
    return "low";
  }
  return "ok";
}

export function inventoryBarPercent(ingredient: Ingredient): number {
  const { current_stock, low_stock_alert } = ingredient;
  if (current_stock <= 0) return 0;
  if (low_stock_alert > 0) {
    return Math.min(100, (current_stock / low_stock_alert) * 100);
  }
  return 100;
}

export interface InventorySummary {
  total: number;
  okCount: number;
  lowCount: number;
  outCount: number;
}

export function summarizeInventory(ingredients: Ingredient[]): InventorySummary {
  let okCount = 0;
  let lowCount = 0;
  let outCount = 0;

  for (const ingredient of ingredients) {
    const status = getInventoryStockStatus(ingredient);
    if (status === "out") outCount++;
    else if (status === "low") lowCount++;
    else okCount++;
  }

  return {
    total: ingredients.length,
    okCount,
    lowCount,
    outCount,
  };
}

export function analyzeStock(
  ingredients: Ingredient[],
  products: Product[],
  allRecipeItems: RecipeItem[],
  purchases: Purchase[],
  movements: StockMovement[]
): StockPageAnalysis {
  const activeProducts = products.filter((p) => p.is_active);
  const maxStockForBar = Math.max(1, ...ingredients.map((i) => i.current_stock));

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const ingredientDetails: IngredientStockDetail[] = ingredients.map((ing) => {
    const unitCost = getUnitCost(ing, purchases);

    const productYields: ProductYield[] = activeProducts
      .map((product) => {
        const recipeItem = allRecipeItems.find(
          (r) => r.product_id === product.id && r.ingredient_id === ing.id
        );
        if (!recipeItem || recipeItem.quantity_per_roll <= 0) return null;
        return {
          productId: product.id,
          productName: product.name,
          qtyPerRoll: recipeItem.quantity_per_roll,
          rollsPossible: Math.floor(
            ing.current_stock / recipeItem.quantity_per_roll
          ),
        };
      })
      .filter((y): y is ProductYield => y !== null);

    const minRollsPossible =
      productYields.length > 0
        ? Math.min(...productYields.map((y) => y.rollsPossible))
        : null;

    const ingMovements = movements.filter((m) => m.ingredient_id === ing.id);
    const todayUsage = ingMovements
      .filter(
        (m) =>
          m.type === "usage" && m.created_at.slice(0, 10) === todayStr
      )
      .reduce((s, m) => s + Math.abs(m.quantity), 0);

    const weekUsage = ingMovements
      .filter(
        (m) =>
          m.type === "usage" && new Date(m.created_at) >= weekAgo
      )
      .reduce((s, m) => s + Math.abs(m.quantity), 0);

    const isLow =
      (minRollsPossible !== null && minRollsPossible < 10) ||
      (ing.low_stock_alert > 0 && ing.current_stock <= ing.low_stock_alert);

    return {
      ingredient: ing,
      unitCost,
      productYields,
      minRollsPossible,
      todayUsage,
      weekUsage,
      isLow,
    };
  });

  const productCapacities: ProductCapacity[] = activeProducts
    .map((product) => {
      const recipe = allRecipeItems.filter((r) => r.product_id === product.id);
      if (recipe.length === 0) return null;

      let maxRolls = Infinity;
      let limitingIngredientId: string | null = null;
      let limitingIngredientName: string | null = null;

      for (const item of recipe) {
        const ing = ingredients.find((i) => i.id === item.ingredient_id);
        if (!ing) continue;
        const rolls = Math.floor(ing.current_stock / item.quantity_per_roll);
        if (rolls < maxRolls) {
          maxRolls = rolls;
          limitingIngredientId = ing.id;
          limitingIngredientName = ing.name;
        }
      }

      if (maxRolls === Infinity) maxRolls = 0;

      return {
        productId: product.id,
        productName: product.name,
        sellingPrice: product.selling_price,
        maxRolls,
        limitingIngredientId,
        limitingIngredientName,
      };
    })
    .filter((c): c is ProductCapacity => c !== null);

  const globalMaxRolls =
    productCapacities.length > 0
      ? Math.max(...productCapacities.map((c) => c.maxRolls))
      : 0;

  const lowStockCount = ingredientDetails.filter((d) => d.isLow).length;

  return {
    ingredientDetails,
    productCapacities,
    maxStockForBar,
    globalMaxRolls,
    lowStockCount,
  };
}
