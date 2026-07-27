import type { RecipeItem } from "./types";

/** หน่วยการผลิตในสูตร — ใช้ตอนเตรียมวัตถุดิบ */
export const PREP_YIELD_UNIT = "แถว" as const;

export function quantityPerRollFromBatch(
  batchQuantity: number,
  batchYield: number
): number {
  if (batchQuantity <= 0 || batchYield <= 0) return 0;
  return batchQuantity / batchYield;
}

export function costPerYieldFromBatch(
  batchQuantity: number,
  batchYield: number,
  unitCost: number
): number {
  const perYield = quantityPerRollFromBatch(batchQuantity, batchYield);
  if (perYield <= 0) return 0;
  return perYield * unitCost;
}

export function resolveRecipeBatch(item: Pick<
  RecipeItem,
  "quantity_per_roll" | "batch_quantity" | "batch_yield"
>): { batchQuantity: number; batchYield: number } | null {
  if (
    item.batch_quantity != null &&
    item.batch_quantity > 0 &&
    item.batch_yield != null &&
    item.batch_yield > 0
  ) {
    return {
      batchQuantity: item.batch_quantity,
      batchYield: item.batch_yield,
    };
  }

  if (item.quantity_per_roll > 0) {
    return {
      batchQuantity: item.quantity_per_roll,
      batchYield: 1,
    };
  }

  return null;
}

export function formatRecipeBatchUsage(
  batchQuantity: number,
  batchYield: number,
  unitLabel: string
): string {
  if (batchQuantity <= 0 || batchYield <= 0) return "—";
  if (batchYield === 1) {
    return `${formatCompact(batchQuantity)} ${unitLabel}/${PREP_YIELD_UNIT}`;
  }
  return `${formatCompact(batchQuantity)} ${unitLabel} → ${formatCompact(batchYield)} ${PREP_YIELD_UNIT}`;
}

export function formatRecipeItemUsage(
  item: Pick<
    RecipeItem,
    "quantity_per_roll" | "batch_quantity" | "batch_yield"
  >,
  unitLabel: string
): string {
  const batch = resolveRecipeBatch(item);
  if (!batch) return "—";
  return formatRecipeBatchUsage(
    batch.batchQuantity,
    batch.batchYield,
    unitLabel
  );
}

function formatCompact(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export function perRowQuantityFromRecipe(
  item: Pick<
    RecipeItem,
    "quantity_per_roll" | "batch_quantity" | "batch_yield"
  >
): number {
  const batch = resolveRecipeBatch(item);
  if (!batch) return 0;
  return batch.batchQuantity / batch.batchYield;
}

export function usageQuantityFromRecipe(
  item: Pick<
    RecipeItem,
    "quantity_per_roll" | "batch_quantity" | "batch_yield"
  >,
  rollCount: number
): number {
  return perRowQuantityFromRecipe(item) * rollCount;
}

export function unitCostFromPurchase(
  purchaseQuantity: number,
  purchaseTotalPrice: number,
  yieldPercent = 100
): number {
  if (purchaseQuantity <= 0 || purchaseTotalPrice < 0) return 0;
  const normalizedYield = Math.min(100, Math.max(0.01, yieldPercent));
  const netQuantity = purchaseQuantity * (normalizedYield / 100);
  return netQuantity > 0 ? purchaseTotalPrice / netQuantity : 0;
}

export function costPerRow(perRowQuantity: number, unitCost: number): number {
  if (perRowQuantity <= 0 || unitCost <= 0) return 0;
  return perRowQuantity * unitCost;
}

export function qtyPerRollFromPurchaseBatch(
  purchaseQuantity: number,
  rollsFromPurchase: number
): number {
  if (purchaseQuantity <= 0 || rollsFromPurchase <= 0) return 0;
  return purchaseQuantity / rollsFromPurchase;
}

export function rollsFromPurchaseBatch(
  purchaseQuantity: number,
  quantityPerRoll: number
): number {
  if (purchaseQuantity <= 0 || quantityPerRoll <= 0) return 0;
  return Math.floor(purchaseQuantity / quantityPerRoll);
}
