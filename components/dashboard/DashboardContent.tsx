import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { Badge, Card, SectionTitle, StatCard } from "@/components/ui";
import { DashboardDateRangePicker } from "@/components/dashboard/DashboardDateRangePicker";
import { PageLoadingSkeleton } from "@/components/ui/PageLoading";
import {
  calculateSaleRevenue,
  formatCurrency,
  formatNumber,
  isLowStock,
} from "@/lib/calculations";
import {
  dashboardRangeLabel,
  resolveDashboardRange,
} from "@/lib/dashboard-range";
import { getSaleChannelLabel } from "@/lib/sales-channels";
import {
  fetchIngredients,
  fetchSales,
  getPeriodSummary,
} from "@/lib/queries";

export function DashboardContentSkeleton() {
  return <PageLoadingSkeleton stats={4} cards={2} />;
}

export async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const dateRange = resolveDashboardRange(
    params.range,
    params.from,
    params.to,
    today
  );
  const rangeLabel = dashboardRangeLabel(dateRange);
  const isTodayOnly =
    dateRange.preset === "today" &&
    dateRange.startDate === today &&
    dateRange.endDate === today;

  const [summary, ingredients, rangeSales] = await Promise.all([
    getPeriodSummary(dateRange.startDate, dateRange.endDate),
    fetchIngredients(),
    fetchSales({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
  ]);

  const lowStockItems = ingredients.filter(isLowStock);
  const outOfStockItems = lowStockItems.filter(
    (ingredient) => ingredient.current_stock <= 0
  );
  const needsRestockItems = lowStockItems.filter(
    (ingredient) => ingredient.current_stock > 0
  );

  const salesLabel = isTodayOnly ? "ขายวันนี้" : "ยอดขาย";
  const revenueLabel = isTodayOnly ? "รายได้วันนี้" : "รายได้";
  const recentSalesTitle = isTodayOnly ? "กิจกรรมขายวันนี้" : "กิจกรรมขายล่าสุด";
  const recentSalesDescription = isTodayOnly
    ? `${rangeSales.length} รายการที่บันทึกในวันนี้`
    : `${rangeSales.length} รายการในช่วง ${rangeLabel}`;

  return (
    <>
      <div className="mb-5 flex flex-col items-stretch gap-2 sm:items-end">
        <Suspense fallback={null}>
          <DashboardDateRangePicker
            preset={dateRange.preset}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            today={today}
          />
        </Suspense>
      </div>

      <div className="app-grid-stats mb-6">
        <StatCard
          label={salesLabel}
          value={`${formatNumber(summary.totalRolls, 0)} ม้วน`}
          variant="accent"
        />
        <StatCard
          label={revenueLabel}
          value={formatCurrency(summary.totalRevenue)}
        />
        <StatCard
          label="กำไรขั้นต้น"
          value={formatCurrency(summary.totalProfit)}
          variant={summary.totalProfit >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="ต้นทุนที่ขาย"
          value={formatCurrency(summary.totalCost)}
        />
      </div>

      <div className="dashboard-support-grid">
        <Card>
          <SectionTitle
            title="สถานะสต็อก"
            description={
              lowStockItems.length === 0
                ? `${ingredients.length} รายการพร้อมขาย`
                : `หมด ${outOfStockItems.length} · ใกล้หมด ${needsRestockItems.length}`
            }
            action={
              <Link href="/stock" className="app-link">
                จัดการสต็อก →
              </Link>
            }
          />
          {lowStockItems.length === 0 ? (
            <div className="dashboard-stock-ok">
              <strong>สต็อกอยู่ในระดับพร้อมขาย</strong>
              <span>ยังไม่มีวัตถุดิบที่ต่ำกว่าจุดแจ้งเตือน</span>
            </div>
          ) : (
            <div className="dashboard-stock-list">
              {lowStockItems.slice(0, 6).map((ingredient) => (
                <div key={ingredient.id} className="dashboard-stock-item">
                  <div>
                    <strong>{ingredient.name}</strong>
                    <span>
                      {ingredient.current_stock <= 0
                        ? "ของหมด — ควรเติมทันที"
                        : "ใกล้ถึงจุดแจ้งเตือน"}
                    </span>
                  </div>
                  <Badge variant="danger">
                    เหลือ {ingredient.current_stock}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle
            title={isTodayOnly ? "ทางลัดวันนี้" : "ทางลัด"}
            description="ไปยังงานที่ต้องทำโดยไม่ต้องค้นหาเมนู"
          />
          <div className="dashboard-action-list">
            <Link href="/sales" className="dashboard-action-item">
              <strong>บันทึกยอดขาย</strong>
              <span>เพิ่มรายการขายของวันนี้ →</span>
            </Link>
            <Link href="/stock" className="dashboard-action-item">
              <strong>เติมหรือปรับสต็อก</strong>
              <span>
                {lowStockItems.length > 0
                  ? `มี ${lowStockItems.length} รายการควรตรวจสอบ →`
                  : "ดูสต็อกทั้งหมด →"}
              </span>
            </Link>
            <Link href="/reports" className="dashboard-action-item">
              <strong>ดูแนวโน้มและสาเหตุ</strong>
              <span>เปรียบเทียบผลกับช่วงก่อนหน้า →</span>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="app-card-flush dashboard-recent-sales">
        <div className="app-card-header">
          <div>
            <h2 className="app-section-title">{recentSalesTitle}</h2>
            <p className="app-section-description mt-1">
              {recentSalesDescription}
            </p>
          </div>
          <Link href="/sales" className="app-btn app-btn-secondary !px-2.5 !py-1.5">
            ดูทั้งหมด
          </Link>
        </div>
        <div className="app-table-wrap">
          <table className="app-table min-w-[680px]">
            <thead>
              <tr>
                <th>เมนู</th>
                <th>วันที่</th>
                <th>จำนวน</th>
                <th>ช่องทางขาย</th>
                <th>รายได้</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rangeSales.slice(0, 5).map((sale) => (
                <tr key={sale.id}>
                  <td className="font-medium">
                    {sale.product?.name ?? "ไม่พบเมนู"}
                  </td>
                  <td className="cell-muted">
                    {new Date(sale.sale_date).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="cell-numeric">
                    {formatNumber(sale.quantity, 0)} ม้วน
                  </td>
                  <td className="cell-muted">
                    {getSaleChannelLabel(sale.channel) || "ไม่ระบุ"}
                  </td>
                  <td className="cell-numeric font-medium">
                    {formatCurrency(
                      calculateSaleRevenue(
                        sale,
                        sale.product?.selling_price ?? 0
                      )
                    )}
                  </td>
                  <td>
                    <Badge variant="success">บันทึกแล้ว</Badge>
                  </td>
                </tr>
              ))}
              {rangeSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="cell-muted text-center">
                    {isTodayOnly
                      ? "ยังไม่มีรายการขายวันนี้"
                      : "ยังไม่มีรายการขายในช่วงนี้"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
