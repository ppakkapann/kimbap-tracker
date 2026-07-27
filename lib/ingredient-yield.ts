import type { Ingredient } from "./types";

/** % ที่ใช้ได้จริงหลังตัดแต่ง — ตั้งที่แก้ไขวัตถุดิบ */
export function getIngredientYieldPercent(
  ingredient: Pick<Ingredient, "price_ref_yield_percent">
): number {
  const raw = ingredient.price_ref_yield_percent ?? 100;
  return Math.min(100, Math.max(0.01, raw));
}

/** แปลงต้นทุนต่อหน่วย (ก่อน yield) → ต้นทุนต่อหน่วยพร้อมใช้ */
export function effectiveUnitCostFromGross(
  grossUnitCost: number,
  yieldPercent: number
): number {
  if (!(grossUnitCost > 0)) return 0;
  const normalized = Math.min(100, Math.max(0.01, yieldPercent));
  if (normalized >= 100) return grossUnitCost;
  return grossUnitCost / (normalized / 100);
}
