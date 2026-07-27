import { DashboardReport } from "@/components/dashboard/DashboardReport";
import { ReportsCostAnalysis } from "@/components/accounting/AccountingCharts";
import { PageHeader } from "@/components/ui";
import { calculateSaleRevenue } from "@/lib/calculations";
import {
  fetchAccountingPage,
  fetchSales,
  getMonthlyReport,
} from "@/lib/queries";
import { format, subDays } from "date-fns";

export default async function ReportsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = today.slice(0, 7);

  const reportWindowDays = 60;
  const periodStart = format(subDays(new Date(today), reportWindowDays - 1), "yyyy-MM-dd");

  const [report, sales, accounting] = await Promise.all([
    getMonthlyReport(reportWindowDays),
    fetchSales({ startDate: periodStart, endDate: today }),
    fetchAccountingPage(currentMonth),
  ]);

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
        subtitle="วิเคราะห์แนวโน้ม เปรียบเทียบช่วงเวลา และหาสาเหตุที่ผลลัพธ์เปลี่ยน"
      />

      <DashboardReport
        today={today}
        report={report}
        productSales={productSales}
      />

      <ReportsCostAnalysis data={accounting.charts} />
    </div>
  );
}
