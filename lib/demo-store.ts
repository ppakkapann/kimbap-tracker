import {
  computeWeightedAvgCost,
  recomputeAvgUnitCostFromPurchases,
  seedAvgUnitCostFromPurchases,
} from "@/lib/accounting";
import {
  calculateCostPerRoll,
  calculateSaleRevenue,
  getUnitCost,
} from "@/lib/calculations";
import { normalizeIngredientCategory } from "@/lib/ingredient-categories";
import { calculatePurchaseYield, effectiveUnitCostFromPriceRef, yieldPercentFromQuantities } from "@/lib/purchase-yield";
import {
  DEFAULT_TARGET_COST_MAX,
  DEFAULT_TARGET_COST_MIN,
} from "@/lib/food-cost";
import {
  demoIngredients,
  DEMO_DATA_VERSION,
  demoProducts,
  demoPurchases,
  demoRecipeItems,
  demoSales,
  demoStockMovements,
  demoOperatingExpenses,
} from "@/lib/demo-data";
import { normalizeSaleLocation, getGpPercentForChannel } from "@/lib/sales-channels";
import { usageQuantityFromRecipe } from "@/lib/recipe-batch";
import { saleProfitFromMovements } from "@/lib/sale-movement-cost";
import {
  validateRecipeStockForSale,
  validateSaleBatchStock,
} from "@/lib/sale-stock";
import {
  areUnitsCompatible,
  normalizePurchaseQuantity,
  normalizeStorageUnit,
  scaleIngredientQuantities,
} from "@/lib/unit-conversion";
import type {
  DailySummary,
  Ingredient,
  IngredientCategory,
  IngredientUnit,
  OperatingExpense,
  Product,
  ProductWithCost,
  Purchase,
  RecipeItem,
  Sale,
  StockMovement,
  StockMovementReason,
} from "@/lib/types";
import { format, subDays } from "date-fns";

const DEMO_USER = "demo-user";

interface DemoState {
  ingredients: Ingredient[];
  products: Product[];
  purchases: Purchase[];
  recipeItems: RecipeItem[];
  sales: Sale[];
  stockMovements: StockMovement[];
  operatingExpenses: OperatingExpense[];
}

declare global {
  var __kimbapDemoStore: DemoState | undefined;
  var __kimbapDemoStoreVersion: number | undefined;
}

function ensureStore(): DemoState {
  if (
    !globalThis.__kimbapDemoStore ||
    globalThis.__kimbapDemoStoreVersion !== DEMO_DATA_VERSION
  ) {
    globalThis.__kimbapDemoStore = seedState();
    globalThis.__kimbapDemoStoreVersion = DEMO_DATA_VERSION;
  }
  return globalThis.__kimbapDemoStore;
}

function store(): DemoState {
  return ensureStore();
}

function seedState(): DemoState {
  const baseIngredients = demoIngredients.map((i) => ({
    ...i,
    avg_unit_cost: 0,
  }));
  const ingredients = seedAvgUnitCostFromPurchases(
    baseIngredients,
    demoPurchases
  );
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  return {
    ingredients,
    products: demoProducts.map((p) => ({ ...p })),
    purchases: demoPurchases.map((p) => ({ ...p })),
    recipeItems: demoRecipeItems.map((r) => ({ ...r })),
    sales: demoSales.map((s) => ({
      ...s,
      product: demoProducts.find((p) => p.id === s.product_id),
    })),
    stockMovements: demoStockMovements.map((m) => ({
      ...m,
      ingredient: ingredientMap.get(m.ingredient_id),
    })),
    operatingExpenses: demoOperatingExpenses.map((expense) => ({ ...expense })),
  };
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function now() {
  return new Date().toISOString();
}

function ingredientRef(id: string) {
  return store().ingredients.find((i) => i.id === id);
}

export function resetDemoStore() {
  globalThis.__kimbapDemoStore = seedState();
  globalThis.__kimbapDemoStoreVersion = DEMO_DATA_VERSION;
}

export function getDemoOperatingExpenses(): OperatingExpense[] {
  return [...store().operatingExpenses].sort((a, b) =>
    b.expense_date.localeCompare(a.expense_date)
  );
}

export function demoRecordOperatingExpense(data: {
  expense_date: string;
  category: string;
  amount: number;
  note?: string;
}) {
  store().operatingExpenses.unshift({
    id: newId("expense"),
    user_id: DEMO_USER,
    expense_date: data.expense_date,
    category: data.category.trim(),
    amount: data.amount,
    note: data.note?.trim() || null,
    created_at: now(),
  });
  return { error: null };
}

export function demoDeleteOperatingExpense(id: string) {
  const state = store();
  state.operatingExpenses = state.operatingExpenses.filter(
    (expense) => expense.id !== id
  );
  return { error: null };
}

export function getDemoIngredients(): Ingredient[] {
  return [...store().ingredients].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );
}

export function getDemoIngredient(id: string): Ingredient | null {
  return store().ingredients.find((i) => i.id === id) ?? null;
}

export function getDemoPurchases(ingredientId?: string): Purchase[] {
  const list = [...store().purchases].sort(
    (a, b) =>
      new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
  );
  return ingredientId
    ? list.filter((p) => p.ingredient_id === ingredientId)
    : list;
}

export function getDemoProducts(): Product[] {
  return [...store().products].sort((a, b) => a.name.localeCompare(b.name));
}

export function getDemoProduct(id: string): Product | null {
  return store().products.find((p) => p.id === id) ?? null;
}

export function getDemoRecipeItems(productId: string): RecipeItem[] {
  return store()
    .recipeItems.filter((r) => r.product_id === productId)
    .map((r) => ({
      ...r,
      ingredient: ingredientRef(r.ingredient_id),
    }));
}

export function getDemoAllRecipeItems(): RecipeItem[] {
  return store().recipeItems.map((r) => ({
    ...r,
    ingredient: ingredientRef(r.ingredient_id),
  }));
}

export function getDemoProductsWithCost(): ProductWithCost[] {
  const purchases = getDemoPurchases();
  const ingredients = getDemoIngredients();
  return getDemoProducts().map((product) => {
    const recipeItems = getDemoRecipeItems(product.id);
    const costPerRoll = calculateCostPerRoll(
      recipeItems,
      purchases,
      ingredients
    );
    const recipeWithCost = recipeItems.map((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredient_id);
      const unitCost = ing
        ? getUnitCost(ing, purchases)
        : 0;
      return {
        ...item,
        unitCost,
        costPerRoll: usageQuantityFromRecipe(item, 1) * unitCost,
      };
    });
    return {
      ...product,
      costPerRoll,
      profitPerRoll: product.selling_price - costPerRoll,
      recipeItems: recipeWithCost,
    };
  });
}

export function getDemoSales(
  date?: string,
  startDate?: string,
  endDate?: string
): Sale[] {
  const list = [...store().sales].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const filtered = list.filter((s) => {
    if (date) return s.sale_date === date;
    if (startDate && s.sale_date < startDate) return false;
    if (endDate && s.sale_date > endDate) return false;
    return true;
  });
  return filtered.map((s) => ({
    ...s,
    product: store().products.find((p) => p.id === s.product_id),
  }));
}

export function getDemoStockMovements(): StockMovement[] {
  return getDemoAllStockMovements().slice(0, 50);
}

export function getDemoAllStockMovements(): StockMovement[] {
  return [...store().stockMovements]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((m) => ({
      ...m,
      ingredient: ingredientRef(m.ingredient_id),
    }));
}

export function getDemoDailySummary(date: string): DailySummary {
  return getDemoPeriodSummary(date, date);
}

export function getDemoPeriodSummary(
  startDate: string,
  endDate: string
): DailySummary {
  const sales = getDemoSales(undefined, startDate, endDate);
  const movements = getDemoAllStockMovements();
  let totalRolls = 0;
  let totalRevenue = 0;
  let totalCost = 0;

  for (const sale of sales) {
    if (!sale.product) continue;
    const { revenue, cost } = saleProfitFromMovements(
      sale,
      sale.product,
      movements
    );
    totalRolls += sale.quantity;
    totalRevenue += revenue;
    totalCost += cost;
  }

  return {
    totalRolls,
    totalRevenue,
    totalCost,
    totalProfit: totalRevenue - totalCost,
  };
}

export function getDemoMonthlyReport(days = 30) {
  const results = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(today, i), "yyyy-MM-dd");
    const summary = getDemoDailySummary(date);
    results.push({
      date,
      rolls: summary.totalRolls,
      revenue: summary.totalRevenue,
      cost: summary.totalCost,
      profit: summary.totalProfit,
    });
  }
  return results.filter((d) => d.rolls > 0);
}

export function getDemoTopProducts() {
  const thirtyDaysAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");
  const sales = getDemoSales().filter((s) => s.sale_date >= thirtyDaysAgo);
  const byProduct: Record<
    string,
    { name: string; quantity: number; revenue: number }
  > = {};

  for (const sale of sales) {
    if (!sale.product) continue;
    const key = sale.product_id;
    if (!byProduct[key]) {
      byProduct[key] = {
        name: sale.product.name,
        quantity: 0,
        revenue: 0,
      };
    }
    byProduct[key].quantity += sale.quantity;
    byProduct[key].revenue += calculateSaleRevenue(
      sale,
      sale.product.selling_price
    );
  }

  return Object.values(byProduct).sort((a, b) => b.quantity - a.quantity);
}

// --- Mutations ---

export function demoCreateIngredient(data: {
  name: string;
  unit: IngredientUnit;
  unit_label?: string | null;
  category?: IngredientCategory;
  low_stock_alert: number;
}) {
  const s = store();
  const maxOrder = s.ingredients.reduce(
    (max, i) => Math.max(max, i.sort_order),
    -1
  );
  s.ingredients.push({
    id: newId("ing"),
    user_id: DEMO_USER,
    name: data.name,
    unit: normalizeStorageUnit(data.unit),
    unit_label: data.unit_label?.trim() || null,
    category: normalizeIngredientCategory(data.category),
    current_stock: 0,
    avg_unit_cost: 0,
    price_ref_quantity: null,
    price_ref_total: null,
    low_stock_alert: data.low_stock_alert,
    sort_order: maxOrder + 1,
    created_at: now(),
  });
  return { error: null };
}

export function demoUpdateIngredient(
  id: string,
  data: {
    name: string;
    unit: IngredientUnit;
    unit_label?: string | null;
    category?: IngredientCategory;
    low_stock_alert: number;
    price_ref_quantity?: number | null;
    price_ref_total?: number | null;
    price_ref_yield_percent?: number | null;
  }
) {
  const ing = store().ingredients.find((i) => i.id === id);
  if (!ing) return { error: "ไม่พบวัตถุดิบ" };
  const oldUnit = ing.unit;
  const normalizedUnit = normalizeStorageUnit(data.unit);
  const unitChanged = oldUnit !== normalizedUnit;

  ing.name = data.name;
  ing.unit = normalizedUnit;
  ing.unit_label = data.unit_label?.trim() || null;
  ing.category = normalizeIngredientCategory(data.category ?? ing.category);
  ing.low_stock_alert = data.low_stock_alert;

  if (unitChanged && areUnitsCompatible(oldUnit, normalizedUnit)) {
    const scaled = scaleIngredientQuantities(
      {
        current_stock: ing.current_stock,
        low_stock_alert: ing.low_stock_alert,
        price_ref_quantity: ing.price_ref_quantity,
        avg_unit_cost: ing.avg_unit_cost,
      },
      oldUnit,
      normalizedUnit
    );
    ing.current_stock = scaled.current_stock;
    ing.avg_unit_cost = scaled.avg_unit_cost;
    if (data.price_ref_quantity === undefined && scaled.price_ref_quantity != null) {
      ing.price_ref_quantity = scaled.price_ref_quantity;
    }

    for (const row of store().recipeItems.filter((r) => r.ingredient_id === id)) {
      const recipeScaled = scaleIngredientQuantities(
        {
          current_stock: 0,
          low_stock_alert: 0,
          price_ref_quantity: null,
          avg_unit_cost: 0,
          quantity_per_roll: row.quantity_per_roll,
          batch_quantity: row.batch_quantity,
        },
        oldUnit,
        normalizedUnit
      );
      row.quantity_per_roll = recipeScaled.quantity_per_roll ?? row.quantity_per_roll;
      row.batch_quantity = recipeScaled.batch_quantity ?? row.batch_quantity;
    }
  }

  if (data.price_ref_quantity !== undefined) {
    ing.price_ref_quantity = data.price_ref_quantity;
  }
  if (data.price_ref_total !== undefined) {
    ing.price_ref_total = data.price_ref_total;
  }
  if (data.price_ref_yield_percent !== undefined) {
    ing.price_ref_yield_percent = data.price_ref_yield_percent;
  }
  return { error: null };
}

export function demoDeleteIngredient(id: string) {
  const s = store();
  s.ingredients = s.ingredients.filter((i) => i.id !== id);
  s.purchases = s.purchases.filter((p) => p.ingredient_id !== id);
  s.recipeItems = s.recipeItems.filter((r) => r.ingredient_id !== id);
  s.stockMovements = s.stockMovements.filter((m) => m.ingredient_id !== id);
  return { error: null };
}

export function demoReorderIngredients(orderedIds: string[]) {
  const s = store();
  orderedIds.forEach((id, index) => {
    const ing = s.ingredients.find((i) => i.id === id);
    if (ing) ing.sort_order = index;
  });
  return { error: null };
}

export function demoRecordPurchase(data: {
  ingredient_id: string;
  quantity: number;
  purchase_unit?: IngredientUnit;
  total_price: number;
  purchased_at: string;
  supplier?: string;
  expires_at?: string;
  note?: string;
}) {
  const s = store();
  const ing = s.ingredients.find((i) => i.id === data.ingredient_id);
  if (!ing) return { error: "ไม่พบวัตถุดิบ" };

  const ingredientUnit = normalizeStorageUnit(ing.unit);
  const purchaseUnit = data.purchase_unit ?? ingredientUnit;
  const stockQuantity = normalizePurchaseQuantity(
    data.quantity,
    purchaseUnit,
    ingredientUnit
  );

  const unitCost = stockQuantity > 0 ? data.total_price / stockQuantity : 0;

  const stockBefore = ing.current_stock;
  ing.avg_unit_cost = computeWeightedAvgCost(
    stockBefore,
    ing.avg_unit_cost,
    stockQuantity,
    data.total_price
  );
  ing.current_stock += stockQuantity;

  const purchaseId = newId("pur");
  s.purchases.push({
    id: purchaseId,
    ingredient_id: data.ingredient_id,
    user_id: DEMO_USER,
    quantity: stockQuantity,
    gross_quantity: stockQuantity,
    yield_percent: 100,
    prep_pending: false,
    total_price: data.total_price,
    unit_cost: unitCost,
    gross_unit_cost: unitCost,
    purchased_at: data.purchased_at,
    supplier: data.supplier?.trim() || null,
    expires_at: data.expires_at || null,
    note: data.note || null,
    created_at: now(),
  });

  s.stockMovements.unshift({
    id: newId("sm"),
    ingredient_id: data.ingredient_id,
    user_id: DEMO_USER,
    type: "purchase",
    quantity: stockQuantity,
    unit_cost: unitCost,
    reference_id: purchaseId,
    note: data.note || "ซื้อเข้า",
    created_at: now(),
    ingredient: ing,
  });

  return { error: null };
}

export function demoDeletePurchase(purchaseId: string) {
  const s = store();
  const purchase = s.purchases.find((p) => p.id === purchaseId);
  if (!purchase) return { error: "ไม่พบรายการซื้อ" };

  const ing = s.ingredients.find((i) => i.id === purchase.ingredient_id);
  if (!ing) return { error: "ไม่พบวัตถุดิบ" };

  if (ing.current_stock < purchase.quantity) {
    return {
      error: `สต็อกเหลือไม่พอตัดย้อน (มี ${ing.current_stock} ต้องการ ${purchase.quantity})`,
    };
  }

  ing.current_stock -= purchase.quantity;
  s.purchases = s.purchases.filter((p) => p.id !== purchaseId);
  s.stockMovements = s.stockMovements.filter(
    (m) => !(m.type === "purchase" && m.reference_id === purchaseId)
  );
  ing.avg_unit_cost = recomputeAvgUnitCostFromPurchases(
    purchase.ingredient_id,
    s.purchases
  );

  return { error: null };
}

export function demoAdjustStock(data: {
  ingredient_id: string;
  new_stock: number;
  note?: string;
}) {
  const s = store();
  const ing = s.ingredients.find((i) => i.id === data.ingredient_id);
  if (!ing) return { error: "ไม่พบวัตถุดิบ" };

  const diff = data.new_stock - ing.current_stock;
  ing.current_stock = data.new_stock;

  if (diff !== 0) {
    s.stockMovements.unshift({
      id: newId("sm"),
      ingredient_id: data.ingredient_id,
      user_id: DEMO_USER,
      type: "adjustment",
      quantity: diff,
      unit_cost: ing.avg_unit_cost || null,
      reference_id: null,
      reason: "count",
      note: data.note || "ปรับจากการตรวจนับ",
      created_at: now(),
      ingredient: ing,
    });
  }

  return { error: null };
}

type WasteReason = Exclude<StockMovementReason, "count">;

const wasteReasonLabels: Record<WasteReason, string> = {
  spoilage: "ของเสีย/หมดอายุ",
  unsold: "ทำแล้วขายไม่หมด",
  test: "ทดลอง/ชิม/แจก",
  personal: "ใช้ส่วนตัว",
  other: "อื่นๆ",
};

export function demoRecordIngredientWaste(data: {
  ingredient_id: string;
  quantity: number;
  reason: WasteReason;
  note?: string;
}) {
  const s = store();
  const ing = s.ingredients.find((i) => i.id === data.ingredient_id);
  if (!ing) return { error: "ไม่พบวัตถุดิบ" };
  if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
    return { error: "จำนวนที่ตัดออกต้องมากกว่า 0" };
  }
  if (data.quantity > ing.current_stock) {
    return { error: `ตัดออกเกินสต็อกที่มี (${ing.current_stock})` };
  }

  ing.current_stock -= data.quantity;
  s.stockMovements.unshift({
    id: newId("sm"),
    ingredient_id: ing.id,
    user_id: DEMO_USER,
    type: "waste",
    quantity: -data.quantity,
    unit_cost: ing.avg_unit_cost || null,
    reference_id: null,
    reason: data.reason,
    note: data.note?.trim() || wasteReasonLabels[data.reason],
    created_at: now(),
    ingredient: ing,
  });
  return { error: null };
}

export function demoRecordProductWaste(data: {
  product_id: string;
  quantity: number;
  reason: WasteReason;
  note?: string;
}) {
  const s = store();
  const product = s.products.find((p) => p.id === data.product_id);
  if (!product) return { error: "ไม่พบเมนู" };
  if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
    return { error: "จำนวนม้วนต้องเป็นจำนวนเต็มมากกว่า 0" };
  }

  const recipe = s.recipeItems.filter((r) => r.product_id === data.product_id);
  if (recipe.length === 0) return { error: "เมนูนี้ยังไม่มีสูตรวัตถุดิบ" };

  for (const item of recipe) {
    const ing = s.ingredients.find((i) => i.id === item.ingredient_id);
    const required = usageQuantityFromRecipe(item, data.quantity);
    if (!ing || required > ing.current_stock) {
      return {
        error: `${ing?.name ?? "วัตถุดิบ"} มีไม่พอ (ต้องใช้ ${required})`,
      };
    }
  }

  const detailNote = `${wasteReasonLabels[data.reason]} · ${product.name} ${data.quantity} ม้วน`;
  for (const item of recipe) {
    const ing = s.ingredients.find((i) => i.id === item.ingredient_id)!;
    const required = usageQuantityFromRecipe(item, data.quantity);
    ing.current_stock -= required;
    s.stockMovements.unshift({
      id: newId("sm"),
      ingredient_id: ing.id,
      user_id: DEMO_USER,
      type: "waste",
      quantity: -required,
      unit_cost: ing.avg_unit_cost || null,
      reference_id: product.id,
      reason: data.reason,
      note: data.note?.trim()
        ? `${detailNote} · ${data.note.trim()}`
        : detailNote,
      created_at: now(),
      ingredient: ing,
    });
  }

  return { error: null };
}

export function demoCreateProduct(data: {
  name: string;
  selling_price: number;
}) {
  const product: Product = {
    id: newId("prod"),
    user_id: DEMO_USER,
    name: data.name,
    selling_price: data.selling_price,
    target_cost_min_percent: DEFAULT_TARGET_COST_MIN,
    target_cost_max_percent: DEFAULT_TARGET_COST_MAX,
    is_active: true,
    created_at: now(),
  };
  store().products.push(product);
  return { error: null, id: product.id };
}

export function demoUpdateProduct(
  id: string,
  data: {
    name: string;
    selling_price: number;
    target_cost_min_percent: number;
    target_cost_max_percent: number;
    is_active: boolean;
  }
) {
  const product = store().products.find((p) => p.id === id);
  if (!product) return { error: "ไม่พบเมนู" };
  product.name = data.name;
  product.selling_price = data.selling_price;
  product.target_cost_min_percent = data.target_cost_min_percent;
  product.target_cost_max_percent = data.target_cost_max_percent;
  product.is_active = data.is_active;
  return { error: null };
}

export function demoDeleteProduct(id: string) {
  const s = store();
  s.products = s.products.filter((p) => p.id !== id);
  s.recipeItems = s.recipeItems.filter((r) => r.product_id !== id);
  s.sales = s.sales.filter((sale) => sale.product_id !== id);
  return { error: null };
}

export function demoSaveRecipeItems(
  productId: string,
  items: {
    ingredient_id: string;
    quantity_per_roll: number;
    batch_quantity?: number;
    batch_yield?: number;
  }[]
) {
  const s = store();
  s.recipeItems = s.recipeItems.filter((r) => r.product_id !== productId);
  for (const item of items) {
    s.recipeItems.push({
      id: newId("r"),
      product_id: productId,
      ingredient_id: item.ingredient_id,
      quantity_per_roll: item.quantity_per_roll,
      batch_quantity: item.batch_quantity ?? item.quantity_per_roll,
      batch_yield: item.batch_yield ?? 1,
    });
  }
  return { error: null };
}

export function demoSaveIngredientRecipeRows(
  productId: string,
  rows: {
    id: string;
    name: string;
    unit: IngredientUnit;
    currentStock: number;
    purchaseQuantity: number;
    purchaseTotalPrice: number;
    purchaseYieldPercent?: number;
    purchaseUsableQuantity?: number;
    quantityPerRoll: number;
  }[]
) {
  const s = store();

  for (const row of rows) {
    const ing = s.ingredients.find((i) => i.id === row.id);
    if (!ing) continue;

    ing.name = row.name;
    ing.unit = row.unit;
    ing.current_stock = Math.max(0, row.currentStock);

    if (row.purchaseQuantity > 0 && row.purchaseTotalPrice >= 0) {
      const yieldPercent =
        row.purchaseUsableQuantity != null &&
        row.purchaseUsableQuantity > 0 &&
        row.purchaseQuantity > 0
          ? yieldPercentFromQuantities(
              row.purchaseQuantity,
              row.purchaseUsableQuantity
            )
          : row.purchaseYieldPercent ?? 100;
      ing.price_ref_quantity = row.purchaseQuantity;
      ing.price_ref_total = row.purchaseTotalPrice;
      ing.price_ref_yield_percent = yieldPercent;

      const hasPurchases = s.purchases.some((p) => p.ingredient_id === row.id);
      if (!hasPurchases) {
        ing.avg_unit_cost = effectiveUnitCostFromPriceRef(
          row.purchaseQuantity,
          row.purchaseTotalPrice,
          yieldPercent
        );
      }
    }

    if (!productId) continue;

    s.recipeItems = s.recipeItems.filter(
      (r) => !(r.product_id === productId && r.ingredient_id === row.id)
    );

    if (row.quantityPerRoll > 0) {
      s.recipeItems.push({
        id: newId("r"),
        product_id: productId,
        ingredient_id: row.id,
        quantity_per_roll: row.quantityPerRoll,
        batch_quantity: row.quantityPerRoll,
        batch_yield: 1,
      });
    }
  }

  return { error: null };
}

export function demoRecordSale(data: {
  product_id: string;
  quantity: number;
  sale_date: string;
  channel: string;
  gp_percent?: number;
  note?: string;
}) {
  const s = store();
  const product = s.products.find((p) => p.id === data.product_id);
  if (!product) return { error: "ไม่พบเมนู" };

  const recipeItems = s.recipeItems.filter(
    (r) => r.product_id === data.product_id
  );
  const stockCtx = {
    getStock: (id: string) => s.ingredients.find((i) => i.id === id)?.current_stock,
    getIngredientName: (id: string) =>
      s.ingredients.find((i) => i.id === id)?.name ?? "วัตถุดิบ",
  };
  const stockError = validateRecipeStockForSale(
    recipeItems,
    data.quantity,
    stockCtx
  );
  if (stockError) return { error: stockError };

  const channel = normalizeSaleLocation(data.channel);
  const gpPercent = data.gp_percent ?? getGpPercentForChannel(channel);

  const saleId = newId("sale");
  s.sales.unshift({
    id: saleId,
    user_id: DEMO_USER,
    product_id: data.product_id,
    quantity: data.quantity,
    sale_date: data.sale_date,
    channel,
    gp_percent: gpPercent,
    note: data.note || null,
    created_at: now(),
    product,
  });

  for (const item of recipeItems) {
    const ing = s.ingredients.find((i) => i.id === item.ingredient_id)!;
    const usageQty = usageQuantityFromRecipe(item, data.quantity);
    const costAtSale = ing.avg_unit_cost;
    ing.current_stock -= usageQty;
    s.stockMovements.unshift({
      id: newId("sm"),
      ingredient_id: item.ingredient_id,
      user_id: DEMO_USER,
      type: "usage",
      quantity: -usageQty,
      unit_cost: costAtSale,
      reference_id: saleId,
      note: `ขาย ${data.quantity} ม้วน`,
      created_at: now(),
      ingredient: ing,
    });
  }

  return { error: null };
}

export function demoRecordSaleBatch(data: {
  items: { product_id: string; quantity: number }[];
  sale_date: string;
  channel: string;
  gp_percent?: number;
  note?: string;
}) {
  if (!data.items.length) return { error: "เพิ่มเมนูในตะกร้าก่อนบันทึก" };

  const s = store();
  const batchError = validateSaleBatchStock(data.items, {
    getStock: (id) => s.ingredients.find((i) => i.id === id)?.current_stock,
    getIngredientName: (id) =>
      s.ingredients.find((i) => i.id === id)?.name ?? "วัตถุดิบ",
    getRecipeItems: (productId) =>
      s.recipeItems.filter((r) => r.product_id === productId),
    getProductName: (productId) =>
      s.products.find((p) => p.id === productId)?.name ?? "เมนู",
  });
  if (batchError) return { error: batchError };

  const billId = newId("bill");
  for (const item of data.items) {
    const result = demoRecordSale({
      ...item,
      sale_date: data.sale_date,
      channel: data.channel,
      gp_percent: data.gp_percent,
      note: data.note,
    });
    if (result.error) return result;
    const latest = store().sales[0];
    if (latest) latest.bill_id = billId;
  }

  return { error: null, bill_id: billId };
}

export function demoUpdateSale(
  id: string,
  data: {
    product_id: string;
    quantity: number;
    sale_date: string;
    channel: string;
    gp_percent?: number;
    note?: string;
  }
) {
  const s = store();
  const sale = s.sales.find((x) => x.id === id);
  if (!sale) return { error: "ไม่พบรายการขาย" };

  const product = s.products.find((p) => p.id === data.product_id);
  if (!product) return { error: "ไม่พบเมนู" };

  const movements = s.stockMovements.filter(
    (m) => m.reference_id === id && m.type === "usage"
  );

  for (const movement of movements) {
    const ing = s.ingredients.find((i) => i.id === movement.ingredient_id);
    if (ing) {
      ing.current_stock -= movement.quantity;
    }
  }

  s.stockMovements = s.stockMovements.filter((m) => m.reference_id !== id);

  const channel = normalizeSaleLocation(data.channel);
  const gpPercent = data.gp_percent ?? getGpPercentForChannel(channel);

  sale.product_id = data.product_id;
  sale.quantity = data.quantity;
  sale.sale_date = data.sale_date;
  sale.channel = channel;
  sale.gp_percent = gpPercent;
  sale.note = data.note || null;
  sale.product = product;

  const recipeItems = s.recipeItems.filter(
    (r) => r.product_id === data.product_id
  );

  for (const item of recipeItems) {
    const ing = s.ingredients.find((i) => i.id === item.ingredient_id);
    if (!ing) continue;
    const usageQty = usageQuantityFromRecipe(item, data.quantity);
    const costAtSale = ing.avg_unit_cost;
    ing.current_stock = Math.max(0, ing.current_stock - usageQty);
    s.stockMovements.unshift({
      id: newId("sm"),
      ingredient_id: item.ingredient_id,
      user_id: DEMO_USER,
      type: "usage",
      quantity: -usageQty,
      unit_cost: costAtSale,
      reference_id: id,
      note: `ขาย ${data.quantity} ม้วน`,
      created_at: now(),
      ingredient: ing,
    });
  }

  return { error: null };
}

export function demoDeleteSale(id: string) {
  const s = store();
  const sale = s.sales.find((x) => x.id === id);
  if (!sale) return { error: "ไม่พบรายการขาย" };

  const movements = s.stockMovements.filter(
    (m) => m.reference_id === id && m.type === "usage"
  );

  for (const movement of movements) {
    const ing = s.ingredients.find((i) => i.id === movement.ingredient_id);
    if (ing) {
      ing.current_stock -= movement.quantity;
    }
  }

  s.stockMovements = s.stockMovements.filter((m) => m.reference_id !== id);
  s.sales = s.sales.filter((x) => x.id !== id);
  return { error: null };
}
