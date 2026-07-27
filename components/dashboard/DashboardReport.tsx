"use client";

import { useState } from "react";
import { format, parse, subDays } from "date-fns";
import { th } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Coins,
  Percent,
  ShoppingBag,
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { ExportReportButton } from "@/components/reports/ExportReportButton";

export type DashboardReportDay = {
  date: string;
  rolls: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type DashboardProductSale = {
  date: string;
  name: string;
  quantity: number;
  revenue: number;
};

type Period = "week" | "month";

const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: "week", label: "7 วัน", days: 7 },
  { value: "month", label: "30 วัน", days: 30 },
];
const CHART_COLORS = ["#25b7c7", "#2dd4a0", "#f4b740", "#7c8cf8", "#f16f65"];
const WIDTH = 760;
const HEIGHT = 250;
const MARGIN = { top: 24, right: 18, bottom: 30, left: 50 };

function dateAtOffset(today: string, offset: number) {
  const date = parse(today, "yyyy-MM-dd", new Date());
  return format(subDays(date, offset), "yyyy-MM-dd");
}

function trend(current: number, previous: number) {
  if (previous === 0) {
    return { text: current > 0 ? "เริ่มมีข้อมูล" : "ยังไม่มีข้อมูล", positive: true };
  }
  const value = ((current - previous) / previous) * 100;
  return {
    text: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
    positive: value >= 0,
  };
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function thaiDateLabel(dateKey: string, includeYear = false) {
  const date = parse(dateKey, "yyyy-MM-dd", new Date());
  const label = format(date, "d MMM", { locale: th });
  return includeYear ? `${label} ${date.getFullYear() + 543}` : label;
}

function linePath(points: { x: number; y: number }[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function ReportMetric({
  label,
  value,
  comparison,
  positive,
  icon,
  primary = false,
  detail,
}: {
  label: string;
  value: string;
  comparison: string;
  positive: boolean;
  icon: React.ReactNode;
  primary?: boolean;
  detail?: string;
}) {
  const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      className={`dashboard-report-metric${primary ? " dashboard-report-metric--primary" : ""}`}
    >
      <div className="dashboard-report-metric-head">
        <span className="dashboard-report-metric-icon">{icon}</span>
        <span
          className={`dashboard-report-trend${positive ? " dashboard-report-trend--up" : " dashboard-report-trend--down"}`}
        >
          <TrendIcon size={11} />
          {comparison}
        </span>
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

export function DashboardReport({
  today,
  report,
  productSales,
}: {
  today: string;
  report: DashboardReportDay[];
  productSales: DashboardProductSale[];
}) {
  const [period, setPeriod] = useState<Period>("month");
  const periodDays = PERIODS.find((item) => item.value === period)?.days ?? 30;

  const byDate = new Map(report.map((day) => [day.date, day]));
  const allDays = Array.from({ length: 60 }, (_, index) => {
    const date = dateAtOffset(today, 59 - index);
    return (
      byDate.get(date) ?? {
        date,
        rolls: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      }
    );
  });

  const currentDays = allDays.slice(-periodDays);
  const previousDays = allDays.slice(-periodDays * 2, -periodDays);
  const startDate = currentDays[0]?.date ?? today;

  function summarize(days: DashboardReportDay[]) {
    return days.reduce(
      (sum, day) => ({
        rolls: sum.rolls + day.rolls,
        revenue: sum.revenue + day.revenue,
        cost: sum.cost + day.cost,
        profit: sum.profit + day.profit,
      }),
      { rolls: 0, revenue: 0, cost: 0, profit: 0 }
    );
  }

  const current = summarize(currentDays);
  const previous = summarize(previousDays);
  const margin = current.revenue > 0 ? (current.profit / current.revenue) * 100 : 0;
  const previousMargin =
    previous.revenue > 0 ? (previous.profit / previous.revenue) * 100 : 0;
  const profitTrend = trend(current.profit, previous.profit);
  const revenueTrend = trend(current.revenue, previous.revenue);
  const rollsTrend = trend(current.rolls, previous.rolls);
  const marginTrend = trend(margin, previousMargin);

  const productBreakdown = (() => {
    const grouped = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    for (const sale of productSales) {
      if (sale.date < startDate || sale.date > today) continue;
      const item = grouped.get(sale.name) ?? {
        name: sale.name,
        quantity: 0,
        revenue: 0,
      };
      item.quantity += sale.quantity;
      item.revenue += sale.revenue;
      grouped.set(sale.name, item);
    }
    return [...grouped.values()].sort((a, b) => b.revenue - a.revenue);
  })();

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxValue = Math.max(
    ...currentDays.flatMap((day) => [day.revenue, day.profit]),
    1
  );
  const yMax = Math.ceil(maxValue / 100) * 100 || 100;
  const toPoint = (value: number, index: number) => ({
    x:
      MARGIN.left +
      (index / Math.max(currentDays.length - 1, 1)) * plotWidth,
    y: MARGIN.top + plotHeight - (Math.max(value, 0) / yMax) * plotHeight,
  });
  const revenuePoints = currentDays.map((day, index) =>
    toPoint(day.revenue, index)
  );
  const profitPoints = currentDays.map((day, index) =>
    toPoint(day.profit, index)
  );
  const areaPath =
    revenuePoints.length > 0
      ? `${linePath(revenuePoints)} L ${revenuePoints.at(-1)?.x} ${MARGIN.top + plotHeight} L ${revenuePoints[0].x} ${MARGIN.top + plotHeight} Z`
      : "";
  const xLabelStep = period === "week" ? 1 : 6;
  const donutTotal = productBreakdown.reduce(
    (sum, product) => sum + product.revenue,
    0
  );

  return (
    <section className="dashboard-report">
      <div className="dashboard-report-toolbar">
        <div>
          <span className="dashboard-report-eyebrow">BUSINESS ANALYSIS</span>
          <h2>เปรียบเทียบผลประกอบการ</h2>
          <p>
            {thaiDateLabel(startDate)}
            {" – "}
            {thaiDateLabel(today, true)}
          </p>
        </div>
        <div className="dashboard-report-actions">
          <div className="dashboard-report-period" aria-label="ช่วงเวลารายงาน">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={period === item.value}
                onClick={() => setPeriod(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <ExportReportButton
            rows={currentDays}
            previousRows={previousDays}
            periodLabel={period === "week" ? "7 วันล่าสุด" : "30 วันล่าสุด"}
          />
        </div>
      </div>

      <div className="dashboard-report-metrics">
        <ReportMetric
          primary
          label="กำไรขั้นต้น"
          value={formatCurrency(current.profit)}
          comparison={profitTrend.text}
          positive={profitTrend.positive}
          icon={<Coins size={16} />}
          detail={`หลังหักต้นทุนวัตถุดิบ ${formatCurrency(current.cost)}`}
        />
        <ReportMetric
          label="รายได้รวม"
          value={formatCurrency(current.revenue)}
          comparison={revenueTrend.text}
          positive={revenueTrend.positive}
          icon={<CircleDollarSign size={16} />}
          detail="เทียบช่วงก่อนหน้า"
        />
        <ReportMetric
          label="อัตรากำไร"
          value={`${margin.toFixed(1)}%`}
          comparison={marginTrend.text}
          positive={marginTrend.positive}
          icon={<Percent size={16} />}
          detail="กำไรขั้นต้น ÷ รายได้"
        />
        <ReportMetric
          label="ยอดขาย"
          value={`${current.rolls} ม้วน`}
          comparison={rollsTrend.text}
          positive={rollsTrend.positive}
          icon={<ShoppingBag size={16} />}
          detail="จำนวนที่บันทึกทั้งหมด"
        />
      </div>

      <div className="dashboard-report-main">
        <div className="dashboard-trend-panel">
          <div className="dashboard-panel-head">
            <div>
              <h3>แนวโน้มรายได้และกำไร</h3>
              <p>ดูทิศทางรายวันและเปรียบเทียบผลประกอบการ</p>
            </div>
            <div className="dashboard-chart-legend">
              <span><i className="dashboard-legend-revenue" />รายได้</span>
              <span><i className="dashboard-legend-profit" />กำไรขั้นต้น</span>
            </div>
          </div>

          <div className="dashboard-chart-scroll">
            <svg
              className="dashboard-report-chart"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label="กราฟแนวโน้มรายได้และกำไรขั้นต้น"
            >
              <defs>
                <linearGradient id="dashboardRevenueArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((ratio) => {
                const y = MARGIN.top + plotHeight - ratio * plotHeight;
                return (
                  <g key={ratio}>
                    <line
                      x1={MARGIN.left}
                      x2={WIDTH - MARGIN.right}
                      y1={y}
                      y2={y}
                      className="dashboard-chart-grid"
                    />
                    <text
                      x={MARGIN.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="dashboard-chart-y-label"
                    >
                      {compactCurrency(yMax * ratio)}
                    </text>
                  </g>
                );
              })}
              <path d={areaPath} fill="url(#dashboardRevenueArea)" />
              <path
                d={linePath(revenuePoints)}
                className="dashboard-chart-line dashboard-chart-line--revenue"
              />
              <path
                d={linePath(profitPoints)}
                className="dashboard-chart-line dashboard-chart-line--profit"
              />
              {currentDays.map((day, index) => {
                const revenuePoint = revenuePoints[index];
                const profitPoint = profitPoints[index];
                const showLabel =
                  index === 0 ||
                  index === currentDays.length - 1 ||
                  index % xLabelStep === 0;
                return (
                  <g key={day.date}>
                    <circle
                      cx={revenuePoint.x}
                      cy={revenuePoint.y}
                      r="7"
                      className="dashboard-chart-hit"
                    >
                      <title>{`${day.date} · รายได้ ${formatCurrency(day.revenue)} · กำไร ${formatCurrency(day.profit)}`}</title>
                    </circle>
                    {day.revenue > 0 && (
                      <circle
                        cx={revenuePoint.x}
                        cy={revenuePoint.y}
                        r="2.2"
                        className="dashboard-chart-point dashboard-chart-point--revenue"
                      />
                    )}
                    {day.profit > 0 && (
                      <circle
                        cx={profitPoint.x}
                        cy={profitPoint.y}
                        r="2"
                        className="dashboard-chart-point dashboard-chart-point--profit"
                      />
                    )}
                    {showLabel && (
                      <text
                        x={revenuePoint.x}
                        y={HEIGHT - 7}
                        textAnchor="middle"
                        className="dashboard-chart-x-label"
                      >
                        {format(
                          parse(day.date, "yyyy-MM-dd", new Date()),
                          "d MMM",
                          { locale: th }
                        )}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <aside className="dashboard-mix-panel">
          <div className="dashboard-panel-head">
            <div>
              <h3>รายได้ตามเมนู</h3>
              <p>สัดส่วนของยอดขายในช่วงนี้</p>
            </div>
          </div>
          {productBreakdown.length === 0 ? (
            <div className="dashboard-report-empty">ยังไม่มียอดขายในช่วงนี้</div>
          ) : (
            <>
              <div className="dashboard-donut-wrap">
                <svg viewBox="0 0 120 120" className="dashboard-donut" aria-hidden>
                  <circle
                    cx="60"
                    cy="60"
                    r="44"
                    pathLength="100"
                    className="dashboard-donut-track"
                  />
                  {productBreakdown.map((product, index) => {
                    const share =
                      donutTotal > 0 ? (product.revenue / donutTotal) * 100 : 0;
                    const offset = productBreakdown
                      .slice(0, index)
                      .reduce(
                        (sum, item) =>
                          sum +
                          (donutTotal > 0
                            ? (item.revenue / donutTotal) * 100
                            : 0),
                        0
                      );
                    return (
                      <circle
                        key={product.name}
                        cx="60"
                        cy="60"
                        r="44"
                        pathLength="100"
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeDasharray={`${share} ${100 - share}`}
                        strokeDashoffset={-offset}
                        className="dashboard-donut-segment"
                      />
                    );
                  })}
                </svg>
                <div className="dashboard-donut-center">
                  <strong>{current.rolls}</strong>
                  <span>ม้วน</span>
                </div>
              </div>
              <div className="dashboard-mix-list">
                {productBreakdown.slice(0, 5).map((product, index) => {
                  const share =
                    donutTotal > 0 ? (product.revenue / donutTotal) * 100 : 0;
                  return (
                    <div key={product.name} className="dashboard-mix-item">
                      <i
                        style={{
                          background: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.quantity} ม้วน</span>
                      </div>
                      <div>
                        <strong>{share.toFixed(0)}%</strong>
                        <span>{formatCurrency(product.revenue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
