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

export type HistoryRangePreset = "month" | "all" | "custom";

export interface HistoryDateRange {
  preset: HistoryRangePreset;
  startDate: string;
  endDate: string;
}

export function monthStartFromToday(today: string): string {
  return `${today.slice(0, 7)}-01`;
}

export function defaultHistoryDateRange(today: string): HistoryDateRange {
  return {
    preset: "month",
    startDate: monthStartFromToday(today),
    endDate: today,
  };
}

export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string,
  range: HistoryDateRange,
  now = new Date()
): T[] {
  if (range.preset === "all") return items;

  let startStr: string;
  let endStr: string;

  if (range.preset === "month") {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    startStr = `${year}-${month}-01`;
    endStr = `${year}-${month}-${String(now.getDate()).padStart(2, "0")}`;
  } else {
    startStr = range.startDate;
    endStr = range.endDate;
  }

  if (!startStr || !endStr) return items;

  return items.filter((item) => {
    const dateStr = getDate(item).slice(0, 10);
    return dateStr >= startStr && dateStr <= endStr;
  });
}

export function sumPurchaseTotal(
  items: { total_price: number }[]
): number {
  return items.reduce((sum, p) => sum + p.total_price, 0);
}
