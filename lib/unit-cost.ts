import { unitCostFromPurchase } from "@/lib/recipe-batch";
import { getLatestUnitCost } from "@/lib/calculations";
import { getIngredientYieldPercent } from "@/lib/ingredient-yield";
import type { Ingredient, Purchase } from "@/lib/types";

/** ต้นทุนจากราคาอ้างอิง (ก่อนมีการซื้อจริง) — คิด yield แล้ว */
export function unitCostFromPriceRef(ingredient: Ingredient): number {
  if (
    ingredient.price_ref_quantity == null ||
    ingredient.price_ref_quantity <= 0 ||
    ingredient.price_ref_total == null
  ) {
    return 0;
  }

  const yieldPercent = getIngredientYieldPercent(ingredient);
  return unitCostFromPurchase(
    ingredient.price_ref_quantity,
    ingredient.price_ref_total,
    yieldPercent
  );
}

/** ลำดับ: avg จากซื้อจริง → ซื้อล่าสุด → ราคาอ้างอิง
 *  การซื้อบันทึกต้นทุนต่อหน่วยที่ใช้ได้แล้ว — yield ใช้เฉพาะราคาอ้างอิง */
export function resolveUnitCost(
  ingredient: Ingredient,
  purchases: Purchase[]
): number {
  if (ingredient.avg_unit_cost > 0) {
    return ingredient.avg_unit_cost;
  }

  const latest = getLatestUnitCost(ingredient.id, purchases);
  if (latest > 0) {
    return latest;
  }

  return unitCostFromPriceRef(ingredient);
}

export function ingredientHasPurchases(
  ingredientId: string,
  purchases: Purchase[]
): boolean {
  return purchases.some((p) => p.ingredient_id === ingredientId);
}
