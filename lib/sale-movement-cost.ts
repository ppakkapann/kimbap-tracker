import { applyGpToRevenue, getSaleGpPercent } from "@/lib/sales-channels";
import type { Product, Sale, StockMovement } from "@/lib/types";

export function saleUsageCostFromMovements(
  saleId: string,
  movements: StockMovement[]
): number {
  return movements
    .filter((m) => m.reference_id === saleId && m.type === "usage")
    .reduce(
      (sum, m) => sum + Math.abs(m.quantity) * (m.unit_cost ?? 0),
      0
    );
}

export function saleRevenueFromSale(sale: Sale, product: Product): number {
  const grossRevenue = product.selling_price * sale.quantity;
  return applyGpToRevenue(grossRevenue, getSaleGpPercent(sale));
}

export function saleProfitFromMovements(
  sale: Sale,
  product: Product,
  movements: StockMovement[]
): { revenue: number; cost: number; profit: number } {
  const revenue = saleRevenueFromSale(sale, product);
  const cost = saleUsageCostFromMovements(sale.id, movements);
  return { revenue, cost, profit: revenue - cost };
}
