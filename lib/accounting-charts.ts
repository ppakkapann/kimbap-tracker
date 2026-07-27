import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns";
import { th } from "date-fns/locale";
import { calculateSaleRevenue } from "@/lib/calculations";
import { buildPeriodSummary, movementAccountingDate, movementValue } from "@/lib/accounting";
import { formatAccountingMonthLabel } from "@/lib/accounting-export";
import {
  DEFAULT_TARGET_COST_MAX,
  DEFAULT_TARGET_COST_MIN,
} from "@/lib/food-cost";
import type {
  AccountingPeriodSummary,
  Ingredient,
  OperatingExpense,
  Purchase,
  Sale,
  StockMovement,
} from "@/lib/types";

export type DailyFoodCostPoint = {
  date: string;
  label: string;
  revenue: number;
  used: number;
  foodCostPercent: number | null;
};

export type CostMixSlice = {
  key: string;
  name: string;
  value: number;
  color: string;
};

export type WaterfallStep = {
  name: string;
  offset: number;
  value: number;
  display: number;
  fill: string;
};

export type MonthlyTrendPoint = {
  month: string;
  monthLabel: string;
  revenue: number;
  grossProfit: number;
};

export type AccountingChartsData = {
  dailyFoodCost: DailyFoodCostPoint[];
  costMix: CostMixSlice[];
  waterfall: WaterfallStep[];
  monthlyTrend: MonthlyTrendPoint[];
};

export type KpiComparison = {
  foodCostPercent: number | null;
  totalRevenue: number | null;
  estimatedNetProfit: number | null;
  grossMargin: number | null;
  primeCostPercent: number | null;
  totalWaste: number | null;
  totalOperatingExpenses: number | null;
};

export function previousMonthKey(month: string): string {
  const date = parse(`${month}-01`, "yyyy-MM-dd", new Date());
  return format(subMonths(date, 1), "yyyy-MM");
}

export function monthKeysEndingAt(month: string, count: number): string[] {
  const end = parse(`${month}-01`, "yyyy-MM-dd", new Date());
  return Array.from({ length: count }, (_, index) =>
    format(subMonths(end, count - 1 - index), "yyyy-MM")
  );
}

export function buildKpiComparison(
  current: AccountingPeriodSummary,
  previous: AccountingPeriodSummary | null
): KpiComparison {
  if (!previous) {
    return {
      foodCostPercent: null,
      totalRevenue: null,
      estimatedNetProfit: null,
      grossMargin: null,
      primeCostPercent: null,
      totalWaste: null,
      totalOperatingExpenses: null,
    };
  }

  return {
    foodCostPercent: pctDelta(
      current.foodCostPercent,
      previous.foodCostPercent
    ),
    totalRevenue: pctDelta(current.totalRevenue, previous.totalRevenue),
    estimatedNetProfit: pctDelta(
      current.estimatedNetProfit,
      previous.estimatedNetProfit
    ),
    grossMargin: pctDelta(current.grossMargin, previous.grossMargin),
    primeCostPercent: pctDelta(
      current.primeCostPercent,
      previous.primeCostPercent
    ),
    totalWaste: pctDelta(current.totalWaste, previous.totalWaste),
    totalOperatingExpenses: pctDelta(
      current.totalOperatingExpenses,
      previous.totalOperatingExpenses
    ),
  };
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function buildDailyFoodCostSeries(
  month: string,
  sales: Sale[],
  saleProfits: { saleId: string; revenue: number }[],
  movements: StockMovement[],
  today: string
): DailyFoodCostPoint[] {
  const monthStart = startOfMonth(parse(`${month}-01`, "yyyy-MM-dd", new Date()));
  const monthEnd = endOfMonth(monthStart);
  const profitMap = new Map(saleProfits.map((row) => [row.saleId, row.revenue]));
  const saleDateById = new Map(sales.map((sale) => [sale.id, sale.sale_date]));
  const isCurrentMonth = month === today.slice(0, 7);
  const cutoff = isCurrentMonth ? today : format(monthEnd, "yyyy-MM-dd");

  return eachDayOfInterval({ start: monthStart, end: monthEnd })
    .map((date) => format(date, "yyyy-MM-dd"))
    .filter((date) => date <= cutoff)
    .map((date) => {
      const daySales = sales.filter((sale) => sale.sale_date === date);
      let revenue = 0;
      for (const sale of daySales) {
        revenue +=
          profitMap.get(sale.id) ??
          (sale.product
            ? calculateSaleRevenue(sale, sale.product.selling_price)
            : 0);
      }

      const used = movements
        .filter(
          (movement) =>
            movement.type === "usage" &&
            movementAccountingDate(movement, saleDateById) === date
        )
        .reduce((sum, movement) => sum + movementValue(movement), 0);

      return {
        date,
        label: format(parse(date, "yyyy-MM-dd", new Date()), "d", {
          locale: th,
        }),
        revenue,
        used,
        foodCostPercent: revenue > 0 ? (used / revenue) * 100 : null,
      };
    });
}

export function buildCostMixSlices(summary: AccountingPeriodSummary): CostMixSlice[] {
  const otherExpenses = Math.max(
    0,
    summary.totalOperatingExpenses - summary.laborExpenses
  );

  return [
    {
      key: "ingredients",
      name: "วัตถุดิบ",
      value: summary.totalUsed,
      color: "#14a8b8",
    },
    {
      key: "labor",
      name: "ค่าแรง",
      value: summary.laborExpenses,
      color: "#f4b740",
    },
    {
      key: "waste",
      name: "ของเสีย",
      value: summary.totalWaste,
      color: "#f16f65",
    },
    {
      key: "other",
      name: "ค่าใช้จ่ายอื่น",
      value: otherExpenses,
      color: "#8b9dc3",
    },
  ].filter((slice) => slice.value > 0);
}

export function buildWaterfallSteps(
  summary: AccountingPeriodSummary
): WaterfallStep[] {
  const revenue = summary.totalRevenue;
  const used = summary.totalUsed;
  const waste = summary.totalWaste;
  const expenses = summary.totalOperatingExpenses;
  const remaining = summary.estimatedNetProfit;
  const afterUsed = revenue - used;
  const afterWaste = afterUsed - waste;
  const afterExpenses = afterWaste - expenses;

  return [
    {
      name: "รายได้",
      offset: 0,
      value: revenue,
      display: revenue,
      fill: "#2dd4a0",
    },
    {
      name: "ต้นทุนที่ขาย",
      offset: afterUsed,
      value: used,
      display: -used,
      fill: "#f16f65",
    },
    {
      name: "ของเสีย",
      offset: afterWaste,
      value: waste,
      display: -waste,
      fill: "#e8796f",
    },
    {
      name: "ค่าใช้จ่ายร้าน",
      offset: afterExpenses,
      value: expenses,
      display: -expenses,
      fill: "#f4b740",
    },
    {
      name: "คงเหลือ",
      offset: 0,
      value: Math.abs(remaining),
      display: remaining,
      fill: remaining >= 0 ? "#2dd4a0" : "#f16f65",
    },
  ];
}

export function buildMonthlyTrend(
  monthKeys: string[],
  purchases: Purchase[],
  movements: StockMovement[],
  sales: Sale[],
  ingredients: Ingredient[],
  saleProfits: { saleId: string; profit: number; revenue: number }[],
  allOperatingExpenses: OperatingExpense[]
): MonthlyTrendPoint[] {
  return monthKeys.map((monthKey) => {
    const monthExpenses = allOperatingExpenses.filter((expense) =>
      expense.expense_date.startsWith(monthKey)
    );
    const summary = buildPeriodSummary(
      monthKey,
      purchases,
      movements,
      sales,
      ingredients,
      saleProfits,
      monthExpenses
    );

    return {
      month: monthKey,
      monthLabel: formatAccountingMonthLabel(monthKey),
      revenue: summary.totalRevenue,
      grossProfit: summary.totalProfit,
    };
  });
}

export function buildAccountingChartsData(
  month: string,
  summary: AccountingPeriodSummary,
  purchases: Purchase[],
  movements: StockMovement[],
  sales: Sale[],
  ingredients: Ingredient[],
  saleProfits: { saleId: string; profit: number; revenue: number }[],
  allOperatingExpenses: OperatingExpense[],
  today: string
): AccountingChartsData {
  return {
    dailyFoodCost: buildDailyFoodCostSeries(
      month,
      sales,
      saleProfits,
      movements,
      today
    ),
    costMix: buildCostMixSlices(summary),
    waterfall: buildWaterfallSteps(summary),
    monthlyTrend: buildMonthlyTrend(
      monthKeysEndingAt(month, 6),
      purchases,
      movements,
      sales,
      ingredients,
      saleProfits,
      allOperatingExpenses
    ),
  };
}

export const FOOD_COST_TARGET = {
  min: DEFAULT_TARGET_COST_MIN,
  max: DEFAULT_TARGET_COST_MAX,
};
