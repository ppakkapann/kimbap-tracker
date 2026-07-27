export interface MonthGroup<T> {
  monthKey: string;
  items: T[];
}

export interface DayGroup<T> {
  dateKey: string;
  items: T[];
}

export function monthKeyFromDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** จัดกลุ่มตาม yyyy-MM (ใหม่ → เก่า) */
export function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string
): MonthGroup<T>[] {
  const sorted = [...items].sort(
    (a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()
  );

  const map = new Map<string, T[]>();
  for (const item of sorted) {
    const key = monthKeyFromDate(getDate(item));
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, groupItems]) => ({ monthKey, items: groupItems }));
}

/** จัดกลุ่มตาม yyyy-MM-dd (ใหม่ → เก่า) */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string
): DayGroup<T>[] {
  const sorted = [...items].sort((a, b) =>
    getDate(b).localeCompare(getDate(a))
  );

  const map = new Map<string, T[]>();
  for (const item of sorted) {
    const key = getDate(item).slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupItems]) => ({ dateKey, items: groupItems }));
}

export type HistoryPeriod = "month" | "quarter" | "all";

export function filterByPeriod<T>(
  items: T[],
  getDate: (item: T) => string,
  period: HistoryPeriod,
  now = new Date()
): T[] {
  if (period === "all") return items;

  const cutoff = new Date(now);
  if (period === "month") {
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);
  } else {
    cutoff.setMonth(cutoff.getMonth() - 3);
    cutoff.setHours(0, 0, 0, 0);
  }

  return items.filter((item) => new Date(getDate(item)) >= cutoff);
}

export function sumPurchaseTotal(
  items: { total_price: number }[]
): number {
  return items.reduce((sum, p) => sum + p.total_price, 0);
}
