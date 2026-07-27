export interface PurchaseYieldCalculation {
  grossQuantity: number;
  yieldPercent: number;
  netQuantity: number;
  lossQuantity: number;
  grossUnitCost: number;
  effectiveUnitCost: number;
}

/** คำนวณ % จากจำนวนซื้อมา vs เหลือใช้ได้ (ไม่ให้ user กรอก %) */
export function yieldPercentFromQuantities(
  grossQuantity: number,
  netQuantity: number
): number {
  if (!(grossQuantity > 0) || !(netQuantity > 0)) return 100;
  return Math.min(100, Math.max(0.01, (netQuantity / grossQuantity) * 100));
}

export function calculatePurchaseYield(
  grossQuantity: number,
  totalPrice: number,
  yieldPercent = 100
): PurchaseYieldCalculation {
  const normalizedYield = Math.min(100, Math.max(0, yieldPercent));
  const netQuantity = grossQuantity * (normalizedYield / 100);

  return {
    grossQuantity,
    yieldPercent: normalizedYield,
    netQuantity,
    lossQuantity: Math.max(0, grossQuantity - netQuantity),
    grossUnitCost: grossQuantity > 0 ? totalPrice / grossQuantity : 0,
    effectiveUnitCost: netQuantity > 0 ? totalPrice / netQuantity : 0,
  };
}

/** True unit cost from price reference: gross unit cost ÷ yield factor */
export function effectiveUnitCostFromPriceRef(
  grossQuantity: number,
  totalPrice: number,
  yieldPercent = 100
): number {
  return calculatePurchaseYield(grossQuantity, totalPrice, yieldPercent)
    .effectiveUnitCost;
}

export function purchaseHasYield(
  purchase: {
    gross_quantity?: number | null;
    yield_percent?: number | null;
    quantity: number;
  }
): boolean {
  return (
    purchase.yield_percent != null &&
    purchase.yield_percent < 100 &&
    (purchase.gross_quantity ?? purchase.quantity) > purchase.quantity
  );
}
