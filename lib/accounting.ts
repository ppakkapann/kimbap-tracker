import type {
  AccountingPeriodSummary,
  Ingredient,
  IngredientAccounting,
  OperatingExpense,
  Purchase,
  Sale,
  StockMovement,
} from "./types";
import { getIngredientUnitLabel } from "./types";
import { getLatestUnitCost, calculateSaleRevenue } from "./calculations";
import { isLaborExpenseCategory } from "./operating-expenses";

export function computeWeightedAvgCost(
  stockBefore: number,
  avgBefore: number,
  purchaseQty: number,
  purchaseTotal: number
): number {
  const newStock = stockBefore + purchaseQty;
  if (newStock <= 0) return purchaseTotal / Math.max(purchaseQty, 1);
  const oldValue = stockBefore * avgBefore;
  return (oldValue + purchaseTotal) / newStock;
}

export function getIngredientUnitCost(
  ingredient: Ingredient,
  purchases: Purchase[]
): number {
  if (ingredient.avg_unit_cost > 0) return ingredient.avg_unit_cost;
  return getLatestUnitCost(ingredient.id, purchases);
}

export function movementValue(movement: StockMovement): number {
  const qty = Math.abs(movement.quantity);
  const cost = movement.unit_cost ?? 0;
  return qty * cost;
}

/** Usage linked to a sale is attributed to sale_date; other movements use created_at. */
export function movementAccountingDate(
  movement: StockMovement,
  saleDateById: Map<string, string>
): string {
  if (movement.type === "usage" && movement.reference_id) {
    const saleDate = saleDateById.get(movement.reference_id);
    if (saleDate) return saleDate;
  }
  return movement.created_at.slice(0, 10);
}

export function movementInAccountingPeriod(
  movement: StockMovement,
  periodStart: string,
  periodEnd: string,
  saleDateById: Map<string, string>
): boolean {
  const date = movementAccountingDate(movement, saleDateById);
  return date >= periodStart && date <= periodEnd;
}

export function sumUsageInPeriod(
  movements: StockMovement[],
  periodStart: string,
  periodEnd: string,
  sales: Sale[]
): number {
  const saleDateById = new Map(sales.map((s) => [s.id, s.sale_date]));
  return movements
    .filter(
      (m) =>
        m.type === "usage" &&
        movementInAccountingPeriod(m, periodStart, periodEnd, saleDateById)
    )
    .reduce((sum, m) => sum + movementValue(m), 0);
}

export function sumWasteInPeriod(
  movements: StockMovement[],
  periodStart: string,
  periodEnd: string,
  sales: Sale[]
): number {
  const saleDateById = new Map(sales.map((s) => [s.id, s.sale_date]));
  return movements
    .filter(
      (m) =>
        m.type === "waste" &&
        movementInAccountingPeriod(m, periodStart, periodEnd, saleDateById)
    )
    .reduce((sum, m) => sum + movementValue(m), 0);
}

export function buildIngredientAccounting(
  ingredient: Ingredient,
  purchases: Purchase[],
  movements: StockMovement[],
  periodStart?: string,
  periodEnd?: string,
  sales: Sale[] = []
): IngredientAccounting {
  const inPeriod = (dateStr: string) => {
    if (!periodStart || !periodEnd) return true;
    return dateStr >= periodStart && dateStr <= periodEnd;
  };

  const saleDateById = new Map(sales.map((s) => [s.id, s.sale_date]));

  const ingredientPurchases = purchases.filter(
    (p) => p.ingredient_id === ingredient.id
  );
  const totalPurchased = ingredientPurchases
    .filter((p) => inPeriod(p.purchased_at))
    .reduce((sum, p) => sum + p.total_price, 0);

  const usageMovements = movements.filter(
    (m) =>
      m.ingredient_id === ingredient.id &&
      m.type === "usage" &&
      (!periodStart ||
        !periodEnd ||
        movementInAccountingPeriod(m, periodStart, periodEnd, saleDateById))
  );
  const totalUsed = usageMovements.reduce(
    (sum, m) => sum + movementValue(m),
    0
  );
  const totalWaste = movements
    .filter(
      (m) =>
        m.ingredient_id === ingredient.id &&
        m.type === "waste" &&
        inPeriod(m.created_at.slice(0, 10))
    )
    .reduce((sum, m) => sum + movementValue(m), 0);

  const avgUnitCost = getIngredientUnitCost(ingredient, purchases);
  const latestUnitCost = getLatestUnitCost(ingredient.id, purchases);
  const stockValue = ingredient.current_stock * avgUnitCost;

  return {
    ingredientId: ingredient.id,
    name: ingredient.name,
    unitLabel: getIngredientUnitLabel(ingredient),
    currentStock: ingredient.current_stock,
    avgUnitCost,
    latestUnitCost,
    totalPurchased,
    totalUsed,
    totalWaste,
    stockValue,
  };
}

export function buildPeriodSummary(
  month: string,
  purchases: Purchase[],
  movements: StockMovement[],
  sales: Sale[],
  ingredients: Ingredient[],
  saleProfits: { saleId: string; profit: number; revenue: number }[],
  operatingExpenses: OperatingExpense[] = []
): AccountingPeriodSummary {
  const [year, mon] = month.split("-").map(Number);
  const periodStart = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const periodEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  const totalPurchased = purchases
    .filter(
      (p) => p.purchased_at >= periodStart && p.purchased_at <= periodEnd
    )
    .reduce((sum, p) => sum + p.total_price, 0);

  const totalUsed = sumUsageInPeriod(
    movements,
    periodStart,
    periodEnd,
    sales
  );
  const totalWaste = movements
    .filter(
      (m) =>
        m.type === "waste" &&
        m.created_at.slice(0, 10) >= periodStart &&
        m.created_at.slice(0, 10) <= periodEnd
    )
    .reduce((sum, m) => sum + movementValue(m), 0);

  const stockValue = ingredients.reduce(
    (sum, ing) => sum + ing.current_stock * getIngredientUnitCost(ing, purchases),
    0
  );

  const monthSales = sales.filter(
    (s) => s.sale_date >= periodStart && s.sale_date <= periodEnd
  );
  const totalRolls = monthSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const profitMap = new Map(saleProfits.map((p) => [p.saleId, p]));
  let totalRevenue = 0;
  for (const sale of monthSales) {
    const p = profitMap.get(sale.id);
    if (p) {
      totalRevenue += p.revenue;
    } else if (sale.product) {
      totalRevenue += calculateSaleRevenue(sale, sale.product.selling_price);
    }
  }
  const totalProfit = totalRevenue - totalUsed - totalWaste;
  const monthOperatingExpenses = operatingExpenses.filter(
    (expense) =>
      expense.expense_date >= periodStart && expense.expense_date <= periodEnd
  );
  const totalOperatingExpenses = monthOperatingExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const laborExpenses = monthOperatingExpenses
    .filter((expense) => isLaborExpenseCategory(expense.category))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const estimatedNetProfit = totalProfit - totalOperatingExpenses;
  const grossMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const foodCostPercent =
    totalRevenue > 0 ? (totalUsed / totalRevenue) * 100 : 0;
  const wastePercent =
    totalUsed + totalWaste > 0
      ? (totalWaste / (totalUsed + totalWaste)) * 100
      : 0;
  const primeCostPercent =
    totalRevenue > 0
      ? ((totalUsed + laborExpenses) / totalRevenue) * 100
      : 0;
  const averageRevenuePerRoll =
    totalRolls > 0 ? totalRevenue / totalRolls : 0;

  return {
    month,
    totalPurchased,
    totalUsed,
    totalWaste,
    stockValue,
    totalRevenue,
    totalProfit,
    totalOperatingExpenses,
    estimatedNetProfit,
    grossMargin,
    totalRolls,
    foodCostPercent,
    wastePercent,
    laborExpenses,
    primeCostPercent,
    averageRevenuePerRoll,
    breakEvenReached: estimatedNetProfit >= 0 && totalRevenue > 0,
  };
}

export function recomputeAvgUnitCostFromPurchases(
  ingredientId: string,
  purchases: Purchase[]
): number {
  const ingPurchases = purchases
    .filter((p) => p.ingredient_id === ingredientId)
    .sort(
      (a, b) =>
        new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime()
    );

  let avg = 0;
  let stock = 0;

  for (const p of ingPurchases) {
    avg = computeWeightedAvgCost(stock, avg, p.quantity, p.total_price);
    stock += p.quantity;
  }

  return avg;
}

export function seedAvgUnitCostFromPurchases(
  ingredients: Ingredient[],
  purchases: Purchase[]
): Ingredient[] {
  return ingredients.map((ing) => {
    const ingPurchases = purchases
      .filter((p) => p.ingredient_id === ing.id)
      .sort(
        (a, b) =>
          new Date(a.purchased_at).getTime() -
          new Date(b.purchased_at).getTime()
      );

    let avg = ing.avg_unit_cost ?? 0;
    let stock = 0;

    for (const p of ingPurchases) {
      avg = computeWeightedAvgCost(stock, avg, p.quantity, p.total_price);
      stock += p.quantity;
    }

    return { ...ing, avg_unit_cost: avg };
  });
}
