import { formatNumber } from "./calculations";
import { purchaseHasYield } from "./purchase-yield";
import type { Ingredient, Purchase, StockMovement } from "./types";
import { getIngredientBaseUnit, getIngredientUnitLabel } from "./types";
import { formatQuantityWithHintText } from "./unit-conversion";
import { groupByMonth, type MonthGroup } from "./history-groups";

export type { HistoryDateRange, HistoryRangePreset } from "./history-groups";
export { filterByDateRange, groupByMonth } from "./history-groups";

/** การซื้อจริง = มี stock_movement ประเภท purchase อ้างอิง (จาก + เติมสต็อก) */
export function filterActualPurchases(
  purchases: Purchase[],
  movements: StockMovement[]
): Purchase[] {
  const linkedIds = new Set(
    movements
      .filter((m) => m.type === "purchase" && m.reference_id)
      .map((m) => m.reference_id as string)
  );
  return purchases.filter((p) => linkedIds.has(p.id));
}

export interface PurchaseMonthGroup extends MonthGroup<Purchase> {
  purchases: Purchase[];
  totalSpent: number;
}

/** ข้อความรายละเอียดใต้ชื่อวัตถุดิบในประวัติการซื้อ */
export function purchaseDetailParts(
  purchase: Purchase,
  ingredient?: Ingredient | null,
  options?: { formatDate?: (isoDate: string) => string }
): string[] {
  const formatDate = options?.formatDate ?? ((value) => value);
  const unit = ingredient ? getIngredientUnitLabel(ingredient) : "";

  const parts: (string | null)[] = [
    purchase.supplier?.trim() || null,
    purchase.expires_at ? `หมดอายุ ${formatDate(purchase.expires_at)}` : null,
    purchase.prep_pending ? "รอเตรียม" : null,
  ];

  if (purchaseHasYield(purchase) && !purchase.prep_pending) {
    if (ingredient) {
      parts.push(
        `ซื้อ ${formatQuantityWithHintText(purchase.gross_quantity ?? purchase.quantity, getIngredientBaseUnit(ingredient), { customLabel: ingredient.unit_label, decimals: 0 })} · ใช้ได้ ${formatQuantityWithHintText(purchase.quantity, getIngredientBaseUnit(ingredient), { customLabel: ingredient.unit_label, decimals: 0 })}`
      );
    } else {
      parts.push(
        `ซื้อ ${formatNumber(purchase.gross_quantity ?? purchase.quantity, 0)} · ใช้ได้ ${formatNumber(purchase.quantity, 0)} ${unit}`
      );
    }
  }

  if (purchase.note?.trim()) {
    parts.push(purchase.note.trim());
  }

  return parts.filter(Boolean) as string[];
}

/** จัดกลุ่มตามเดือนที่ซื้อ (ใหม่ → เก่า) */
export function groupPurchasesByMonth(
  purchases: Purchase[]
): PurchaseMonthGroup[] {
  return groupByMonth(purchases, (p) => p.purchased_at).map((group) => ({
    ...group,
    purchases: group.items,
    totalSpent: group.items.reduce((sum, p) => sum + p.total_price, 0),
  }));
}
