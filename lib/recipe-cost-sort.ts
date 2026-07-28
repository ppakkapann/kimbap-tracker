export type RecipeCostSort = "desc" | "asc";

export const RECIPE_COST_SORT_OPTIONS: {
  value: RecipeCostSort;
  label: string;
}[] = [
  { value: "desc", label: "แพงสุดก่อน" },
  { value: "asc", label: "ถูกสุดก่อน" },
];

export function sortIndicesByCost(
  costs: number[],
  sort: RecipeCostSort,
  nameForIndex?: (index: number) => string
): number[] {
  return costs
    .map((cost, index) => ({ cost, index }))
    .sort((a, b) => {
      const costDiff = b.cost - a.cost;
      if (costDiff !== 0) {
        return sort === "desc" ? costDiff : -costDiff;
      }
      if (nameForIndex) {
        return nameForIndex(a.index).localeCompare(nameForIndex(b.index), "th");
      }
      return a.index - b.index;
    })
    .map(({ index }) => index);
}

export function sortByRecipeCost<T>(
  items: T[],
  getCost: (item: T) => number,
  getLabel: (item: T) => string,
  sort: RecipeCostSort
): T[] {
  return [...items].sort((a, b) => {
    const costDiff = getCost(b) - getCost(a);
    if (costDiff !== 0) {
      return sort === "desc" ? costDiff : -costDiff;
    }
    return getLabel(a).localeCompare(getLabel(b), "th");
  });
}
