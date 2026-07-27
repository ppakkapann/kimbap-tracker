export const EXPENSE_CATEGORIES = [
  { value: "packaging", label: "บรรจุภัณฑ์" },
  { value: "transport", label: "ค่าเดินทาง" },
  { value: "utilities", label: "ค่าน้ำ / ไฟ / แก๊ส" },
  { value: "rent", label: "ค่าเช่า" },
  { value: "labor", label: "ค่าแรง" },
  { value: "fees", label: "ค่าธรรมเนียม" },
  { value: "marketing", label: "การตลาด" },
  { value: "equipment", label: "อุปกรณ์" },
  { value: "other", label: "อื่นๆ" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];

const CATEGORY_LABELS = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.value, category.label])
) as Record<string, string>;

export function getExpenseCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function isPackagingExpenseCategory(category: string): boolean {
  const trimmed = category.trim();
  if (!trimmed) return false;
  if (trimmed === "packaging") return true;
  return trimmed.includes("บรรจุภัณฑ์");
}

export function isLaborExpenseCategory(category: string): boolean {
  const trimmed = category.trim();
  if (!trimmed) return false;
  if (trimmed === "labor") return true;
  return trimmed.includes("ค่าแรง");
}

export function getPackagingExpenseHint(category: string): string | null {
  if (!isPackagingExpenseCategory(category)) return null;
  return "ใช้เมื่อซื้อแบบไม่แยกต่อม้วน (เช่น สติกเกอร์) — กล่อง/ตะเกียบต่อม้วนให้บันทึกที่สต็อกและใส่ในสูตร ไม่ต้องลงบัญชีซ้ำ";
}

export function collectKnownExpenseCategories(
  expenses: { category: string }[]
): string[] {
  const counts = new Map<string, number>();

  for (const expense of expenses) {
    const category = expense.category.trim();
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "th")
    )
    .map(([category]) => category);
}

export function mergeExpenseCategorySuggestions(
  knownCategories: string[]
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const category of [
    ...knownCategories,
    ...EXPENSE_CATEGORIES.map((item) => item.label),
  ]) {
    const trimmed = category.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    merged.push(trimmed);
  }

  return merged;
}
