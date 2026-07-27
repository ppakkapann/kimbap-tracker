import { Suspense } from "react";
import { format } from "date-fns";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { QuickSaleForm } from "@/components/sales/QuickSaleForm";
import { SalesBillList } from "@/components/sales/SalesBillList";
import { SalesChannelSummary } from "@/components/sales/SalesChannelSummary";
import { SalesDayNavigator } from "@/components/sales/SalesDayNavigator";
import { SalesOverview } from "@/components/sales/SalesOverview";
import { SalesPageDateSync } from "@/components/sales/SalesPageDateSync";
import { Card, SectionTitle, StatCard } from "@/components/ui";
import { PageLoadingSkeleton } from "@/components/ui/PageLoading";
import { calculateSaleProfit, formatCurrency, formatNumber } from "@/lib/calculations";
import { collectLocationPresetsFromSales } from "@/lib/sale-location-presets";
import { recipeItemsByProduct } from "@/lib/recipe-index";
import {
  isValidSalesPageDate,
  resolveSalesPageDate,
  SALES_PAGE_DATE_COOKIE,
} from "@/lib/sales-page-date";
import {
  fetchAllRecipeItems,
  fetchIngredients,
  fetchKnownSaleLocations,
  fetchProductsWithCost,
  fetchPurchases,
  fetchSalePresetRows,
  fetchSales,
  fetchStockMovementsForSales,
  getSalesOverview,
  summarizeSalesPeriod,
} from "@/lib/queries";

function SalesOverviewSkeleton() {
  return (
    <Card className="mb-6 sales-overview-card">
      <PageLoadingSkeleton titleWidth="6rem" stats={0} cards={1} />
    </Card>
  );
}

async function SalesOverviewSection({
  today,
  selectedDate,
}: {
  today: string;
  selectedDate: string;
}) {
  const overview = await getSalesOverview(today, selectedDate);
  return (
    <Card className="mb-6 sales-overview-card">
      <SalesOverview data={overview} />
    </Card>
  );
}

export function SalesPageSkeleton() {
  return <PageLoadingSkeleton stats={4} cards={2} />;
}

export async function SalesPageContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const cookieStore = await cookies();
  const rememberedDate = cookieStore.get(SALES_PAGE_DATE_COOKIE)?.value;

  if (!isValidSalesPageDate(dateParam, today) && isValidSalesPageDate(rememberedDate, today)) {
    redirect(`/sales?date=${rememberedDate}`);
  }

  const selectedDate = resolveSalesPageDate(dateParam, rememberedDate, today);
  const isToday = selectedDate === today;

  const [
    products,
    sales,
    presetRows,
    purchases,
    ingredients,
    allRecipeItems,
    knownLocations,
  ] = await Promise.all([
    fetchProductsWithCost(),
    fetchSales({ date: selectedDate }),
    fetchSalePresetRows(),
    fetchPurchases(),
    fetchIngredients(),
    fetchAllRecipeItems(),
    fetchKnownSaleLocations(),
  ]);

  const saleUsageMovements = await fetchStockMovementsForSales(sales);
  const summary = summarizeSalesPeriod(sales, saleUsageMovements);
  const savedLocationPresets = collectLocationPresetsFromSales(presetRows);
  const recipesByProduct = recipeItemsByProduct(allRecipeItems);

  const salesWithProfit = sales.map((sale) => {
    if (!sale.product) return { sale, profit: 0 };
    const recipeItems = recipesByProduct.get(sale.product_id) ?? [];
    const { profit } = calculateSaleProfit(
      sale,
      sale.product,
      recipeItems,
      purchases,
      ingredients,
      saleUsageMovements
    );
    return { sale, profit };
  });

  const dateLabel = new Date(selectedDate).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <SalesPageDateSync selectedDate={selectedDate} />
      <p className="app-subtitle -mt-4 mb-6">{dateLabel}</p>

      <div className="app-grid-stats mb-6">
        <StatCard
          label={isToday ? "ขายวันนี้" : "ขายวันนั้น"}
          value={`${formatNumber(summary.totalRolls, 0)} ม้วน`}
          variant="accent"
        />
        <StatCard
          label="รายได้"
          value={formatCurrency(summary.totalRevenue)}
        />
        <StatCard
          label={isToday ? "กำไรวันนี้" : "กำไรวันนั้น"}
          value={formatCurrency(summary.totalProfit)}
          variant="success"
        />
        <StatCard
          label="ต้นทุน"
          value={formatCurrency(summary.totalCost)}
          variant="default"
        />
      </div>

      <Suspense fallback={<SalesOverviewSkeleton />}>
        <SalesOverviewSection today={today} selectedDate={selectedDate} />
      </Suspense>

      {sales.length > 0 && (
        <SalesChannelSummary sales={sales} knownLocations={knownLocations} />
      )}

      <div className="history-grid sales-page-panels">
        <Card className="history-panel-card sales-quick-form-card">
          <SectionTitle
            title="บันทึกขายเร็ว"
            description="เลือกเมนู สถานที่ขาย และวันที่"
          />
          <div className="history-panel-body sales-quick-form-body">
            <QuickSaleForm
              products={products}
              defaultSaleDate={selectedDate}
              savedLocationPresets={savedLocationPresets}
            />
          </div>
        </Card>

        <Card className="history-panel-card sales-list-panel-card">
          <SectionTitle
            title="รายการขาย"
            description={`${salesWithProfit.length} รายการ`}
            action={
              <SalesDayNavigator selectedDate={selectedDate} today={today} />
            }
          />
          <div className="history-panel-body">
            {salesWithProfit.length === 0 ? (
              <div className="history-panel-scroll sales-list-scroll">
                <div className="history-panel-empty history-panel-empty--fill">
                  <p>ยังไม่มีรายการขาย</p>
                  <span>
                    {isToday ? "บันทึกยอดขายด้านซ้าย" : "ลองเลือกวันอื่น"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="history-panel-scroll sales-list-scroll">
                <SalesBillList
                  rows={salesWithProfit}
                  products={products}
                  knownLocations={knownLocations}
                  savedLocationPresets={savedLocationPresets}
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
