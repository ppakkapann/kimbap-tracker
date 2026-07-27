import {
  DEFAULT_INGREDIENT_CATEGORY,
  getDistinctCategories,
  normalizeIngredientCategory,
} from "@/lib/ingredient-categories";
import type { Ingredient } from "@/lib/types";

const STORAGE_KEY = "kimbap-ingredient-category-presets";
const MAX_PRESETS = 24;

export const DEFAULT_INGREDIENT_CATEGORY_SUGGESTIONS = [
  DEFAULT_INGREDIENT_CATEGORY,
  "บรรจุภัณฑ์",
  "อื่นๆ",
];

function categoryKey(value: string): string {
  return value.toLocaleLowerCase("th").trim();
}

export function loadRememberedIngredientCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeIngredientCategory(item))
      .filter((item) => item.length > 0)
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

export function rememberIngredientCategory(category: string) {
  if (typeof window === "undefined") return;
  const trimmed = normalizeIngredientCategory(category);
  if (!trimmed) return;

  const key = categoryKey(trimmed);
  const existing = loadRememberedIngredientCategories().filter(
    (item) => categoryKey(item) !== key
  );
  const next = [trimmed, ...existing].slice(0, MAX_PRESETS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function collectCategoriesFromIngredients(
  ingredients: Pick<Ingredient, "category">[]
): string[] {
  return getDistinctCategories(ingredients);
}

export function mergeIngredientCategorySuggestions(
  fromIngredients: string[],
  remembered: string[] = loadRememberedIngredientCategories()
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const list of [remembered, fromIngredients, DEFAULT_INGREDIENT_CATEGORY_SUGGESTIONS]) {
    for (const item of list) {
      const label = normalizeIngredientCategory(item);
      const key = categoryKey(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      ordered.push(label);
    }
  }

  return ordered;
}
