import type { Purchase, StockMovement } from "./types";
import { groupByMonth, type MonthGroup } from "./history-groups";

export type { HistoryPeriod } from "./history-groups";
export { filterByPeriod, groupByMonth } from "./history-groups";

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
