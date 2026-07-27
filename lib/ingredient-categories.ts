import type { Ingredient } from "@/lib/types";

export type IngredientCategory = string;

export const DEFAULT_INGREDIENT_CATEGORY = "อาหาร";

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  food: "อาหาร",
  packaging: "บรรจุภัณฑ์",
  other: "อื่นๆ",
};

export const INGREDIENT_CATEGORY_PALETTE = [
  { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.14)" },
  { color: "#a78bfa", bg: "rgba(167, 139, 250, 0.14)" },
  { color: "#34d399", bg: "rgba(52, 211, 153, 0.14)" },
  { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.14)" },
  { color: "#fb7185", bg: "rgba(251, 113, 133, 0.14)" },
  { color: "#22d3ee", bg: "rgba(34, 211, 238, 0.14)" },
  { color: "#f472b6", bg: "rgba(244, 114, 182, 0.14)" },
  { color: "#818cf8", bg: "rgba(129, 140, 248, 0.14)" },
] as const;

function categoryKey(value: string): string {
  return value.toLocaleLowerCase("th").trim();
}

export function normalizeIngredientCategory(
  category: string | null | undefined
): string {
  const trimmed = category?.trim() ?? "";
  if (!trimmed) return DEFAULT_INGREDIENT_CATEGORY;
  if (trimmed in LEGACY_CATEGORY_LABELS) {
    return LEGACY_CATEGORY_LABELS[trimmed];
  }
  return trimmed;
}

export function getIngredientCategoryLabel(
  category: string | null | undefined
): string {
  return normalizeIngredientCategory(category);
}

export function getDistinctCategories(
  ingredients: Pick<Ingredient, "category">[]
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const item of ingredients) {
    const label = normalizeIngredientCategory(item.category);
    const key = categoryKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(label);
  }

  return ordered.sort((a, b) => a.localeCompare(b, "th"));
}

export function getCategoryPaletteIndex(
  category: string,
  allCategories: string[]
): number {
  const sorted = [...allCategories].sort((a, b) =>
    categoryKey(a).localeCompare(categoryKey(b), "th")
  );
  const index = sorted.findIndex(
    (item) => categoryKey(item) === categoryKey(category)
  );
  return index >= 0 ? index : sorted.length;
}

export function getCategoryPalette(
  category: string,
  allCategories: string[]
): (typeof INGREDIENT_CATEGORY_PALETTE)[number] {
  const index =
    getCategoryPaletteIndex(category, allCategories) %
    INGREDIENT_CATEGORY_PALETTE.length;
  return INGREDIENT_CATEGORY_PALETTE[index];
}

export function getCategoryBadgeStyle(
  category: string,
  allCategories: string[]
): { color: string; background: string } {
  const palette = getCategoryPalette(category, allCategories);
  return { color: palette.color, background: palette.bg };
}

export function getCategoryFilterStyle(
  category: string,
  allCategories: string[],
  active: boolean
): { color: string; background: string; borderColor: string } {
  const palette = getCategoryPalette(category, allCategories);
  if (active) {
    return {
      color: palette.color,
      background: palette.bg,
      borderColor: `color-mix(in srgb, ${palette.color} 42%, var(--border))`,
    };
  }
  return {
    color: "var(--text-secondary)",
    background: "var(--bg-base)",
    borderColor: `color-mix(in srgb, ${palette.color} 24%, var(--border-subtle))`,
  };
}

export function isPackagingCategory(
  category: string | null | undefined
): boolean {
  const normalized = normalizeIngredientCategory(category);
  const key = categoryKey(normalized);
  if (key === "packaging" || key === "บรรจุภัณฑ์") return true;
  return normalized.includes("บรรจุ");
}

function getRecipeGroupSortRank(category: string): number {
  if (isPackagingCategory(category)) return 2;
  if (normalizeIngredientCategory(category) === DEFAULT_INGREDIENT_CATEGORY) {
    return 0;
  }
  return 1;
}

/** BOM section order: อาหาร → หมวดอื่น → บรรจุภัณฑ์ */
export function compareRecipeGroupOrder(a: string, b: string): number {
  const rankDiff = getRecipeGroupSortRank(a) - getRecipeGroupSortRank(b);
  if (rankDiff !== 0) return rankDiff;
  return a.localeCompare(b, "th");
}

export function groupIngredientsForSelect(ingredients: Ingredient[]) {
  return getDistinctCategories(ingredients)
    .map((category) => ({
      category,
      label: category,
      items: ingredients.filter(
        (item) => normalizeIngredientCategory(item.category) === category
      ),
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => compareRecipeGroupOrder(a.category, b.category));
}

export function countIngredientsByCategory(
  ingredients: Pick<Ingredient, "category">[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of ingredients) {
    const category = normalizeIngredientCategory(item.category);
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}

export function compareIngredientCategory(
  a: Pick<Ingredient, "category">,
  b: Pick<Ingredient, "category">
): number {
  return getIngredientCategoryLabel(a.category).localeCompare(
    getIngredientCategoryLabel(b.category),
    "th"
  );
}
