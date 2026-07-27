import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parse,
  startOfMonth,
} from "date-fns";
import { th } from "date-fns/locale";
import { calculateSaleRevenue } from "@/lib/calculations";
import type { Sale } from "@/lib/types";

export const SALES_CHART_COLORS = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--blue)",
  "#8b9cf6",
  "#e879a9",
] as const;

/** Distinct from menu line colors — used only for the combined total series. */
export const SALES_OVERVIEW_TOTAL_COLOR = "#c084fc";

export type SalesMonthChartSegment = {
  productId: string;
  quantity: number;
  revenue: number;
};

export type SalesMonthChartDay = {
  date: string;
  dayLabel: string;
  weekdayLabel: string;
  isSelected: boolean;
  totalRolls: number;
  totalRevenue: number;
  segments: SalesMonthChartSegment[];
};

export type SalesMonthChartProduct = {
  id: string;
  name: string;
  color: string;
};

export type SalesMonthChartData = {
  monthKey: string;
  monthLabel: string;
  products: SalesMonthChartProduct[];
  days: SalesMonthChartDay[];
  maxRolls: number;
  monthTotalRolls: number;
  monthTotalRevenue: number;
};

export function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

export function buildMonthlySalesChartData(
  sales: Sale[],
  monthKey: string,
  selectedDate?: string
): SalesMonthChartData {
  const monthStart = startOfMonth(parse(`${monthKey}-01`, "yyyy-MM-dd", new Date()));
  const monthEnd = endOfMonth(monthStart);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const productMap = new Map<string, SalesMonthChartProduct>();
  let colorIdx = 0;

  for (const sale of sales) {
    if (!sale.product) continue;
    if (productMap.has(sale.product_id)) continue;
    productMap.set(sale.product_id, {
      id: sale.product_id,
      name: sale.product.name,
      color: SALES_CHART_COLORS[colorIdx % SALES_CHART_COLORS.length],
    });
    colorIdx += 1;
  }

  const products = [...productMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "th")
  );

  const byDate = new Map<
    string,
    Map<string, { quantity: number; revenue: number }>
  >();

  for (const sale of sales) {
    if (!sale.product) continue;
    const date = sale.sale_date;
    if (!byDate.has(date)) byDate.set(date, new Map());
    const dayProducts = byDate.get(date)!;
    const existing = dayProducts.get(sale.product_id) ?? {
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += sale.quantity;
    existing.revenue += calculateSaleRevenue(sale, sale.product.selling_price);
    dayProducts.set(sale.product_id, existing);
  }

  const days: SalesMonthChartDay[] = allDays.map((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayProducts = byDate.get(dateKey);
    const segments: SalesMonthChartSegment[] = [];

    for (const product of products) {
      const data = dayProducts?.get(product.id);
      if (!data || data.quantity <= 0) continue;
      segments.push({
        productId: product.id,
        quantity: data.quantity,
        revenue: data.revenue,
      });
    }

    const totalRolls = segments.reduce((sum, seg) => sum + seg.quantity, 0);
    const totalRevenue = segments.reduce((sum, seg) => sum + seg.revenue, 0);

    return {
      date: dateKey,
      dayLabel: format(day, "d", { locale: th }),
      weekdayLabel: format(day, "EEE", { locale: th }),
      isSelected: dateKey === selectedDate,
      totalRolls,
      totalRevenue,
      segments,
    };
  });

  const maxRolls = Math.max(...days.map((day) => day.totalRolls), 1);
  const monthTotalRolls = days.reduce((sum, day) => sum + day.totalRolls, 0);
  const monthTotalRevenue = days.reduce(
    (sum, day) => sum + day.totalRevenue,
    0
  );

  return {
    monthKey,
    monthLabel: format(monthStart, "MMMM yyyy", { locale: th }),
    products,
    days,
    maxRolls,
    monthTotalRolls,
    monthTotalRevenue,
  };
}
