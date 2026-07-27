import { createClient } from "@/lib/supabase/server";
import { buildPeriodSummary } from "@/lib/accounting";
import { isDemoMode } from "@/lib/config";
import { filterActualPurchases } from "@/lib/purchases";
import {
  buildAccountingChartsData,
} from "@/lib/accounting-charts";
import {
  buildSalesOverviewData,
  getSalesOverviewEndDate,
  getSalesOverviewStartDate,
} from "@/lib/sales-overview";
import { collectKnownSaleLocations } from "@/lib/sales-channels";
import {
  getDemoAllRecipeItems,
  getDemoAllStockMovements,
  getDemoPeriodSummary,
  getDemoIngredient,
  getDemoIngredients,
  getDemoMonthlyReport,
  getDemoOperatingExpenses,
  getDemoProduct,
  getDemoProducts,
  getDemoProductsWithCost,
  getDemoPurchases,
  getDemoRecipeItems,
  getDemoSales,
  getDemoStockMovements,
  getDemoTopProducts,
} from "@/lib/demo-store";
import {
  buildRecipeItemsWithCost,
  calculateCostPerRoll,
  calculateSaleProfit,
  calculateSaleRevenue,
  getUnitCost,
} from "@/lib/calculations";
import { saleProfitFromMovements } from "@/lib/sale-movement-cost";
import type {
  DailySummary,
  Ingredient,
  OperatingExpense,
  Product,
  ProductWithCost,
  Purchase,
  RecipeItem,
  Sale,
  StockMovement,
} from "@/lib/types";
import { format, subDays } from "date-fns";

export async function fetchIngredients(): Promise<Ingredient[]> {
  if (isDemoMode()) return getDemoIngredients();
  const supabase = await createClient();
  const { data } = await supabase!
    .from("ingredients")
    .select("*")
    .order("sort_order")
    .order("name");
  return data ?? [];
}

export async function fetchIngredient(id: string): Promise<Ingredient | null> {
  if (isDemoMode()) return getDemoIngredient(id);
  const supabase = await createClient();
  const { data } = await supabase!
    .from("ingredients")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function fetchPurchases(
  ingredientId?: string
): Promise<Purchase[]> {
  if (isDemoMode()) return getDemoPurchases(ingredientId);
  const supabase = await createClient();
  let query = supabase!
    .from("purchases")
    .select("*")
    .order("purchased_at", { ascending: false });

  if (ingredientId) {
    query = query.eq("ingredient_id", ingredientId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function fetchProducts(): Promise<Product[]> {
  if (isDemoMode()) return getDemoProducts();
  const supabase = await createClient();
  const { data } = await supabase!.from("products").select("*").order("name");
  return data ?? [];
}

export async function fetchProduct(id: string): Promise<Product | null> {
  if (isDemoMode()) return getDemoProduct(id);
  const supabase = await createClient();
  const { data } = await supabase!
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function fetchRecipeItems(
  productId: string
): Promise<RecipeItem[]> {
  if (isDemoMode()) return getDemoRecipeItems(productId);
  const supabase = await createClient();
  const { data } = await supabase!
    .from("recipe_items")
    .select("*, ingredient:ingredients(*)")
    .eq("product_id", productId);
  return data ?? [];
}

export async function fetchAllRecipeItems(): Promise<RecipeItem[]> {
  if (isDemoMode()) return getDemoAllRecipeItems();
  const supabase = await createClient();
  const { data } = await supabase!
    .from("recipe_items")
    .select("*, ingredient:ingredients(*)");
  return data ?? [];
}

export async function fetchProductsWithCost(): Promise<ProductWithCost[]> {
  if (isDemoMode()) return getDemoProductsWithCost();
  const products = await fetchProducts();
  const purchases = await fetchPurchases();
  const ingredients = await fetchIngredients();

  const result: ProductWithCost[] = [];

  for (const product of products) {
    const recipeItems = await fetchRecipeItems(product.id);
    const costPerRoll = calculateCostPerRoll(
      recipeItems,
      purchases,
      ingredients
    );
    const recipeWithCost = buildRecipeItemsWithCost(
      recipeItems,
      purchases,
      ingredients
    );

    result.push({
      ...product,
      costPerRoll,
      profitPerRoll: product.selling_price - costPerRoll,
      recipeItems: recipeWithCost,
    });
  }

  return result;
}

export async function fetchSales(options?: {
  date?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Sale[]> {
  if (isDemoMode()) {
    return getDemoSales(options?.date, options?.startDate, options?.endDate);
  }
  const supabase = await createClient();
  let query = supabase!
    .from("sales")
    .select("*, product:products(*)")
    .order("created_at", { ascending: false });

  if (options?.date) {
    query = query.eq("sale_date", options.date);
  } else {
    if (options?.startDate) {
      query = query.gte("sale_date", options.startDate);
    }
    if (options?.endDate) {
      query = query.lte("sale_date", options.endDate);
    }
  }

  const { data } = await query;
  return data ?? [];
}

export async function fetchKnownSaleLocations(): Promise<string[]> {
  const sales = await fetchSales();
  return collectKnownSaleLocations(sales);
}

export async function fetchOperatingExpenses(
  month?: string
): Promise<OperatingExpense[]> {
  if (isDemoMode()) {
    const expenses = getDemoOperatingExpenses();
    return month
      ? expenses.filter((expense) => expense.expense_date.startsWith(month))
      : expenses;
  }

  const supabase = await createClient();
  let query = supabase!
    .from("operating_expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (month) {
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    query = query
      .gte("expense_date", `${month}-01`)
      .lte(
        "expense_date",
        `${month}-${String(lastDay).padStart(2, "0")}`
      );
  }

  const { data } = await query;
  return data ?? [];
}

export async function fetchSalesSince(
  startDate: string,
  endDate: string
): Promise<Sale[]> {
  if (isDemoMode()) {
    return getDemoSales().filter(
      (sale) => sale.sale_date >= startDate && sale.sale_date <= endDate
    );
  }

  const supabase = await createClient();
  const { data } = await supabase!
    .from("sales")
    .select("*, product:products(*)")
    .gte("sale_date", startDate)
    .lte("sale_date", endDate)
    .order("sale_date");

  return data ?? [];
}

export async function getSalesOverview(today: string, selectedDate: string) {
  const sales = await fetchSalesSince(
    getSalesOverviewStartDate(selectedDate),
    getSalesOverviewEndDate(today, selectedDate)
  );
  return buildSalesOverviewData(sales, today, selectedDate);
}

export async function fetchAllStockMovements(): Promise<StockMovement[]> {
  if (isDemoMode()) return getDemoAllStockMovements();
  const supabase = await createClient();
  const { data } = await supabase!
    .from("stock_movements")
    .select("*, ingredient:ingredients(*)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  if (isDemoMode()) return getDemoStockMovements();
  const supabase = await createClient();
  const { data } = await supabase!
    .from("stock_movements")
    .select("*, ingredient:ingredients(*)")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getDailySummary(date: string): Promise<DailySummary> {
  return getPeriodSummary(date, date);
}

export async function fetchStockMovementsForSales(
  sales: Sale[]
): Promise<StockMovement[]> {
  if (sales.length === 0) return [];
  const saleIds = new Set(sales.map((s) => s.id));
  if (isDemoMode()) {
    return getDemoAllStockMovements().filter(
      (m) =>
        m.type === "usage" &&
        m.reference_id != null &&
        saleIds.has(m.reference_id)
    );
  }
  const supabase = await createClient();
  const ids = [...saleIds];
  const { data } = await supabase!
    .from("stock_movements")
    .select("*")
    .eq("type", "usage")
    .in("reference_id", ids);
  return data ?? [];
}

export async function getPeriodSummary(
  startDate: string,
  endDate: string
): Promise<DailySummary> {
  if (isDemoMode()) return getDemoPeriodSummary(startDate, endDate);

  const sales = await fetchSales({ startDate, endDate });
  const movements = await fetchStockMovementsForSales(sales);

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

export async function getMonthlyReport(days = 30): Promise<
  {
    date: string;
    rolls: number;
    revenue: number;
    cost: number;
    profit: number;
  }[]
> {
  if (isDemoMode()) return getDemoMonthlyReport(days);

  const supabase = await createClient();
  const periodStart = format(subDays(new Date(), days - 1), "yyyy-MM-dd");

  const { data: sales } = await supabase!
    .from("sales")
    .select("*, product:products(*)")
    .gte("sale_date", periodStart)
    .order("sale_date");

  const saleList = sales ?? [];
  const movements = await fetchStockMovementsForSales(saleList);
  const byDate: Record<
    string,
    { rolls: number; revenue: number; cost: number }
  > = {};

  for (const sale of saleList) {
    if (!sale.product) continue;
    const { revenue, cost } = saleProfitFromMovements(
      sale,
      sale.product,
      movements
    );

    if (!byDate[sale.sale_date]) {
      byDate[sale.sale_date] = { rolls: 0, revenue: 0, cost: 0 };
    }
    byDate[sale.sale_date].rolls += sale.quantity;
    byDate[sale.sale_date].revenue += revenue;
    byDate[sale.sale_date].cost += cost;
  }

  return Object.entries(byDate)
    .map(([date, data]) => ({
      date,
      rolls: data.rolls,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.revenue - data.cost,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopProducts(): Promise<
  { name: string; quantity: number; revenue: number }[]
> {
  if (isDemoMode()) return getDemoTopProducts();

  const supabase = await createClient();
  const thirtyDaysAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const { data: sales } = await supabase!
    .from("sales")
    .select("*, product:products(*)")
    .gte("sale_date", thirtyDaysAgo);

  const byProduct: Record<
    string,
    { name: string; quantity: number; revenue: number }
  > = {};

  for (const sale of sales ?? []) {
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

export async function fetchAccountingPage(month: string) {
  const [
    ingredients,
    allPurchases,
    movements,
    sales,
    operatingExpenses,
    allOperatingExpenses,
  ] = await Promise.all([
    fetchIngredients(),
    fetchPurchases(),
    fetchAllStockMovements(),
    fetchSales(),
    fetchOperatingExpenses(month),
    fetchOperatingExpenses(),
  ]);

  const purchases = filterActualPurchases(allPurchases, movements);

  const saleProfits = sales.map((sale) => {
    const product = sale.product;
    if (!product) {
      return Promise.resolve({ saleId: sale.id, profit: 0, revenue: 0 });
    }
    const usageMovements = movements.filter(
      (m) => m.reference_id === sale.id && m.type === "usage"
    );
    if (usageMovements.length > 0) {
      const { profit, revenue } = saleProfitFromMovements(
        sale,
        product,
        movements
      );
      return Promise.resolve({ saleId: sale.id, profit, revenue });
    }
    return (async () => {
      const recipeItems = await fetchRecipeItems(sale.product_id);
      const { profit, revenue } = calculateSaleProfit(
        sale,
        product,
        recipeItems,
        purchases,
        ingredients
      );
      return { saleId: sale.id, profit, revenue };
    })();
  });

  const resolvedSaleProfits = await Promise.all(saleProfits);

  const summary = buildPeriodSummary(
    month,
    purchases,
    movements,
    sales,
    ingredients,
    resolvedSaleProfits,
    operatingExpenses
  );

  const charts = buildAccountingChartsData(
    month,
    summary,
    purchases,
    movements,
    sales,
    ingredients,
    resolvedSaleProfits,
    allOperatingExpenses,
    format(new Date(), "yyyy-MM-dd")
  );

  return {
    summary,
    charts,
    operatingExpenses,
    allOperatingExpenses,
  };
}
