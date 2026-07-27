import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  parse,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { th } from "date-fns/locale";
import { SALES_CHART_COLORS } from "@/lib/sales-month-chart";
import { calculateSaleRevenue } from "@/lib/calculations";
import type { Sale } from "@/lib/types";

export type SalesOverviewMode = "day" | "week" | "year";

export type SalesOverviewProduct = {
  id: string;
  name: string;
  color: string;
};

export type SalesOverviewProductValue = {
  productId: string;
  quantity: number;
  revenue: number;
};

export type SalesOverviewBucket = {
  key: string;
  label: string;
  fullLabel: string;
  startDate: string;
  endDate: string;
  selected: boolean;
  totalRolls: number;
  totalRevenue: number;
  products: SalesOverviewProductValue[];
};

export type SalesOverviewBreakdown = SalesOverviewProduct & {
  quantity: number;
  revenue: number;
  share: number;
};

export type SalesOverviewView = {
  mode: SalesOverviewMode;
  label: string;
  rangeLabel: string;
  buckets: SalesOverviewBucket[];
  breakdown: SalesOverviewBreakdown[];
  totalRolls: number;
  totalRevenue: number;
  averageRolls: number;
  bestLabel: string;
  bestRolls: number;
  maxValue: number;
};

export type SalesOverviewData = {
  today: string;
  selectedDate: string;
  products: SalesOverviewProduct[];
  views: Record<SalesOverviewMode, SalesOverviewView>;
};

type BucketDefinition = Pick<
  SalesOverviewBucket,
  "key" | "label" | "fullLabel" | "startDate" | "endDate"
>;

function asDate(value: string): Date {
  return parse(value, "yyyy-MM-dd", new Date());
}

function asKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function thaiYear(date: Date): number {
  return date.getFullYear() + 543;
}

function buildDayDefinitions(
  anchor: Date,
  today: string
): BucketDefinition[] {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const monthKey = format(monthStart, "yyyy-MM");
  const todayMonthKey = today.slice(0, 7);

  let endDate: Date;
  if (monthKey === todayMonthKey) {
    endDate = asDate(today);
  } else if (monthKey < todayMonthKey) {
    endDate = monthEnd;
  } else {
    return [];
  }

  if (endDate < monthStart) return [];

  return eachDayOfInterval({ start: monthStart, end: endDate }).map((date) => ({
    key: asKey(date),
    label: format(date, "d", { locale: th }),
    fullLabel: format(date, "d MMM yyyy", { locale: th }),
    startDate: asKey(date),
    endDate: asKey(date),
  }));
}

function buildDayRangeLabel(anchor: Date, today: string): string {
  const monthLabel = `${format(anchor, "MMMM", { locale: th })} ${thaiYear(anchor)}`;
  const monthKey = format(startOfMonth(anchor), "yyyy-MM");

  if (monthKey === today.slice(0, 7)) {
    const lastDay = format(asDate(today), "d", { locale: th });
    return `${monthLabel} · วันที่ 1–${lastDay}`;
  }

  return monthLabel;
}

function buildWeekDefinitions(anchor: Date): BucketDefinition[] {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const definitions: BucketDefinition[] = [];
  let start = monthStart;
  let index = 1;

  while (start <= monthEnd) {
    const tentativeEnd = addDays(start, 6);
    const end = tentativeEnd > monthEnd ? monthEnd : tentativeEnd;
    const rangeLabel = `${format(start, "d", { locale: th })}–${format(end, "d MMM", { locale: th })}`;

    definitions.push({
      key: asKey(start),
      label: `สัปดาห์ ${index}`,
      fullLabel: rangeLabel,
      startDate: asKey(start),
      endDate: asKey(end),
    });

    start = addDays(end, 1);
    index += 1;
  }

  return definitions;
}

function buildYearDefinitions(anchor: Date): BucketDefinition[] {
  const yearStart = startOfYear(anchor);
  return Array.from({ length: 12 }, (_, index) => {
    const start = new Date(yearStart.getFullYear(), index, 1);
    const end = endOfMonth(start);

    return {
      key: format(start, "yyyy-MM"),
      label: format(start, "MMM", { locale: th }),
      fullLabel: format(start, "MMMM yyyy", { locale: th }),
      startDate: asKey(start),
      endDate: asKey(end),
    };
  });
}

function buildView(
  mode: SalesOverviewMode,
  label: string,
  rangeLabel: string,
  definitions: BucketDefinition[],
  products: SalesOverviewProduct[],
  sales: Sale[],
  selectedDate: string,
  today: string
): SalesOverviewView {
  const buckets = definitions.map((definition) => {
    const bucketSales = sales.filter(
      (sale) =>
        sale.sale_date >= definition.startDate &&
        sale.sale_date <= definition.endDate &&
        sale.product
    );

    const productValues = products
      .map((product) => {
        const productSales = bucketSales.filter(
          (sale) => sale.product_id === product.id
        );
        return {
          productId: product.id,
          quantity: productSales.reduce(
            (sum, sale) => sum + sale.quantity,
            0
          ),
          revenue: productSales.reduce(
            (sum, sale) =>
              sum +
              calculateSaleRevenue(sale, sale.product?.selling_price ?? 0),
            0
          ),
        };
      })
      .filter((value) => value.quantity > 0);

    return {
      ...definition,
      selected:
        selectedDate >= definition.startDate &&
        selectedDate <= definition.endDate,
      totalRolls: productValues.reduce(
        (sum, product) => sum + product.quantity,
        0
      ),
      totalRevenue: productValues.reduce(
        (sum, product) => sum + product.revenue,
        0
      ),
      products: productValues,
    };
  });

  const totalRolls = buckets.reduce(
    (sum, bucket) => sum + bucket.totalRolls,
    0
  );
  const totalRevenue = buckets.reduce(
    (sum, bucket) => sum + bucket.totalRevenue,
    0
  );
  const elapsedBuckets = buckets.filter((bucket) => bucket.startDate <= today);
  const bestBucket = [...elapsedBuckets].sort(
    (a, b) => b.totalRolls - a.totalRolls
  )[0];
  const breakdown = products
    .map((product) => {
      const quantity = buckets.reduce(
        (sum, bucket) =>
          sum +
          (bucket.products.find((value) => value.productId === product.id)
            ?.quantity ?? 0),
        0
      );
      const revenue = buckets.reduce(
        (sum, bucket) =>
          sum +
          (bucket.products.find((value) => value.productId === product.id)
            ?.revenue ?? 0),
        0
      );

      return {
        ...product,
        quantity,
        revenue,
        share: totalRolls > 0 ? (quantity / totalRolls) * 100 : 0,
      };
    })
    .filter((product) => product.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity);

  return {
    mode,
    label,
    rangeLabel,
    buckets,
    breakdown,
    totalRolls,
    totalRevenue,
    averageRolls:
      elapsedBuckets.length > 0 ? totalRolls / elapsedBuckets.length : 0,
    bestLabel: bestBucket?.fullLabel ?? "—",
    bestRolls: bestBucket?.totalRolls ?? 0,
    maxValue: Math.max(
      ...buckets.flatMap((bucket) =>
        bucket.products.map((product) => product.quantity)
      ),
      1
    ),
  };
}

export function getSalesOverviewStartDate(today: string): string {
  return asKey(startOfYear(asDate(today)));
}

export function getSalesOverviewEndDate(
  today: string,
  selectedDate: string
): string {
  const selectedEnd = asKey(endOfYear(asDate(selectedDate)));
  return selectedEnd < today ? selectedEnd : today;
}

export function buildSalesOverviewData(
  sales: Sale[],
  today: string,
  selectedDate: string
): SalesOverviewData {
  const safeToday = today || selectedDate || asKey(new Date());
  const safeSelected = selectedDate || safeToday;
  const anchorDate = asDate(safeSelected);
  const productMap = new Map<string, { id: string; name: string }>();

  for (const sale of sales) {
    if (!sale.product) continue;
    productMap.set(sale.product_id, {
      id: sale.product_id,
      name: sale.product.name,
    });
  }

  const products = [...productMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "th"))
    .map((product, index) => ({
      ...product,
      color: SALES_CHART_COLORS[index % SALES_CHART_COLORS.length],
    }));

  const dayDefinitions = buildDayDefinitions(anchorDate, safeToday);
  const weekDefinitions = buildWeekDefinitions(anchorDate);
  const yearDefinitions = buildYearDefinitions(anchorDate);
  const monthLabel = `${format(anchorDate, "MMMM", { locale: th })} ${thaiYear(anchorDate)}`;
  const dayRangeLabel = buildDayRangeLabel(anchorDate, safeToday);
  const yearLabel = `ปี ${thaiYear(anchorDate)} · ม.ค.–ธ.ค.`;

  return {
    today: safeToday,
    selectedDate: safeSelected,
    products,
    views: {
      day: buildView(
        "day",
        "รายวัน",
        dayRangeLabel,
        dayDefinitions,
        products,
        sales,
        safeSelected,
        safeToday
      ),
      week: buildView(
        "week",
        "รายสัปดาห์",
        `${monthLabel} · แบ่งทุก 7 วัน`,
        weekDefinitions,
        products,
        sales,
        safeSelected,
        safeToday
      ),
      year: buildView(
        "year",
        "รายปี",
        yearLabel,
        yearDefinitions,
        products,
        sales,
        safeSelected,
        safeToday
      ),
    },
  };
}
