const STORAGE_KEY = "kimbap-ingredient-order";

export function loadIngredientOrder(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : null;
  } catch {
    return null;
  }
}

export function saveIngredientOrder(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function mergeIngredientOrder(
  saved: string[] | null,
  currentIds: string[]
): string[] {
  if (!saved?.length) return currentIds;

  const idSet = new Set(currentIds);
  const ordered = saved.filter((id) => idSet.has(id));
  for (const id of currentIds) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

export function sortByOrder<T extends { id: string; sort_order?: number }>(
  items: T[],
  orderIds: string[] | null
): T[] {
  if (orderIds?.length) {
    const map = new Map(items.map((item) => [item.id, item]));
    const sorted = orderIds
      .map((id) => map.get(id))
      .filter((item): item is T => item !== undefined);
    for (const item of items) {
      if (!orderIds.includes(item.id)) sorted.push(item);
    }
    return sorted;
  }

  return [...items].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      a.id.localeCompare(b.id)
  );
}
