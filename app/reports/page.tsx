import { PageHeader } from "@/components/ui";
import { buildAccountingExportPayload } from "@/lib/accounting-export";
import { calculateSaleRevenue } from "@/lib/calculations";
import { buildDataExportPayload } from "@/lib/data-export";
import {
  fetchAccountingPage,
  fetchAllRecipeItems,
  fetchAllStockMovements,
  fetchIngredients,
  fetchProducts,
  fetchPurchases,
  fetchSales,
  getMonthlyReport,
} from "@/lib/queries";
import { format, subDays } from "date-fns";
import { ReportsPageClient } from "./ReportsPageClient";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = today.slice(0, 7);
  const exportMonth = monthParam || currentMonth;
  const exportedAt = new Date().toISOString();

  const reportWindowDays = 60;
  const periodStart = format(
    subDays(new Date(today), reportWindowDays - 1),
    "yyyy-MM-dd"
  );

  const [
    report,
    sales,
    accounting,
    exportAccounting,
    allSales,
    products,
    recipeItems,
    purchases,
    ingredients,
    movements,
  ] = await Promise.all([
    getMonthlyReport(reportWindowDays),
    fetchSales({ startDate: periodStart, endDate: today }),
    fetchAccountingPage(currentMonth),
    fetchAccountingPage(exportMonth),
    fetchSales(),
    fetchProducts(),
    fetchAllRecipeItems(),
    fetchPurchases(),
    fetchIngredients(),
    fetchAllStockMovements(),
  ]);

  const exportData = buildDataExportPayload({
    sales: allSales,
    products,
    recipeItems,
    purchases,
    ingredients,
    movements,
    exportedAt,
  });

  const accountingExport = buildAccountingExportPayload(
    exportMonth,
    exportAccounting.summary,
    exportAccounting.operatingExpenses
  );

  const productSales = sales
    .filter((sale) => sale.product)
    .map((sale) => ({
      date: sale.sale_date,
      name: sale.product!.name,
      quantity: sale.quantity,
      revenue: calculateSaleRevenue(sale, sale.product!.selling_price),
    }));

  return (
    <div>
      <PageHeader
        title="รายงาน"
        subtitle="วิเคราะห์แนวโน้ม เปรียบเทียบช่วงเวลา และส่งออกข้อมูล"
      />

      <ReportsPageClient
        today={today}
        report={report}
        productSales={productSales}
        charts={accounting.charts}
        exportData={exportData}
        accountingExport={accountingExport}
        exportMonth={exportMonth}
      />
    </div>
  );
}
