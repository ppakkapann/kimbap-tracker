import { applyGpToRevenue, getSaleGpPercent } from "./sales-channels";
import { perRowQuantityFromRecipe } from "./recipe-batch";
import { resolveUnitCost } from "./unit-cost";
import type {
  Ingredient,
  Product,
  Purchase,
  RecipeItem,
  RecipeItemWithCost,
  Sale,
  StockMovement,
} from "./types";
import { saleUsageCostFromMovements } from "./sale-movement-cost";

const thNumberFormatters = new Map<string, Intl.NumberFormat>();

function getThNumberFormat(
  options: Intl.NumberFormatOptions
): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let formatter = thNumberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", {
      useGrouping: true,
      ...options,
    });
    thNumberFormatters.set(key, formatter);
  }
  return formatter;
}

export function formatCurrency(amount: number): string {
  return getThNumberFormat({
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount: number, decimals = 2): string {
  return getThNumberFormat({
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function stripNumberGrouping(value: string): string {
  return value.replace(/,/g, "").trim();
}

export function parseFormattedNumber(value: string): number | null {
  const stripped = stripNumberGrouping(value);
  if (stripped === "" || stripped === "-" || stripped === ".") return null;
  const parsed = Number(stripped);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sanitizeNumberInput(
  raw: string,
  maxDecimals = 2,
  allowDecimals = true
): string {
  let next = stripNumberGrouping(raw);
  if (!allowDecimals || maxDecimals === 0) {
    return next.replace(/\D/g, "");
  }

  next = next.replace(/[^\d.]/g, "");
  const dotIndex = next.indexOf(".");
  if (dotIndex === -1) {
    return next.replace(/\D/g, "");
  }

  const intPart = next.slice(0, dotIndex).replace(/\D/g, "");
  const decPart = next
    .slice(dotIndex + 1)
    .replace(/\D/g, "")
    .slice(0, maxDecimals);
  const endsWithDot = next.endsWith(".");

  if (endsWithDot && decPart.length === 0) {
    return intPart === "" ? "0." : `${intPart}.`;
  }

  return decPart.length > 0 ? `${intPart}.${decPart}` : intPart;
}

export function formatNumberInputDisplay(
  value: string | number,
  maxDecimals = 2,
  allowDecimals = true
): string {
  const plain =
    typeof value === "number"
      ? String(value)
      : stripNumberGrouping(String(value ?? ""));

  const sanitized = sanitizeNumberInput(plain, maxDecimals, allowDecimals);
  if (sanitized === "") return "";
  if (sanitized === ".") return "0.";

  const [intPart = "", decPart] = sanitized.split(".");
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decPart !== undefined) {
    return sanitized.endsWith(".") && decPart === ""
      ? `${groupedInt}.`
      : `${groupedInt}.${decPart}`;
  }

  return groupedInt;
}

export function formatStockAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? formatNumber(rounded, 0)
    : formatNumber(rounded, 2);
}

export function getLatestUnitCost(
  ingredientId: string,
  purchases: Purchase[]
): number {
  const ingredientPurchases = purchases
    .filter((p) => p.ingredient_id === ingredientId)
    .sort(
      (a, b) =>
        new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
    );

  return ingredientPurchases[0]?.unit_cost ?? 0;
}

export function getUnitCost(
  ingredient: Ingredient,
  purchases: Purchase[]
): number {
  return resolveUnitCost(ingredient, purchases);
}

export function calculateRecipeItemCost(
  item: RecipeItem,
  unitCost: number
): number {
  const perRollQty = perRowQuantityFromRecipe(item);
  return perRollQty * unitCost;
}

export function buildRecipeItemsWithCost(
  recipeItems: RecipeItem[],
  purchases: Purchase[],
  ingredients?: Ingredient[]
): RecipeItemWithCost[] {
  return recipeItems.map((item) => {
    const ing = ingredients?.find((i) => i.id === item.ingredient_id);
    const unitCost = ing
      ? getUnitCost(ing, purchases)
      : getLatestUnitCost(item.ingredient_id, purchases);
    return {
      ...item,
      unitCost,
      costPerRoll: calculateRecipeItemCost(item, unitCost),
    };
  });
}

export function calculateCostPerRoll(
  recipeItems: RecipeItem[],
  purchases: Purchase[],
  ingredients?: Ingredient[]
): number {
  return buildRecipeItemsWithCost(recipeItems, purchases, ingredients).reduce(
    (sum, item) => sum + item.costPerRoll,
    0
  );
}

export function calculateYield(
  ingredient: Ingredient,
  quantityPerRoll: number
): number {
  if (quantityPerRoll <= 0) return 0;
  return ingredient.current_stock / quantityPerRoll;
}

export function calculateSaleProfit(
  sale: Sale,
  product: Product,
  recipeItems: RecipeItem[],
  purchases: Purchase[],
  ingredients?: Ingredient[],
  movements?: StockMovement[]
): { revenue: number; cost: number; profit: number; grossRevenue: number } {
  const costPerRoll = calculateCostPerRoll(recipeItems, purchases, ingredients);
  const grossRevenue = product.selling_price * sale.quantity;
  const revenue = applyGpToRevenue(grossRevenue, getSaleGpPercent(sale));
  const usageAtSale =
    movements?.filter(
      (m) => m.reference_id === sale.id && m.type === "usage"
    ) ?? [];
  const cost =
    usageAtSale.length > 0
      ? saleUsageCostFromMovements(sale.id, movements!)
      : costPerRoll * sale.quantity;
  return { revenue, cost, profit: revenue - cost, grossRevenue };
}

export function calculateSaleRevenue(
  sale: Pick<Sale, "quantity" | "gp_percent" | "channel">,
  sellingPrice: number
): number {
  const grossRevenue = sellingPrice * sale.quantity;
  return applyGpToRevenue(grossRevenue, getSaleGpPercent(sale));
}

export function isLowStock(ingredient: Ingredient): boolean {
  return (
    ingredient.low_stock_alert > 0 &&
    ingredient.current_stock <= ingredient.low_stock_alert
  );
}
