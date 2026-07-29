import { format, parse, subDays } from "date-fns";
import type { DashboardReportDay } from "@/components/dashboard/DashboardReport";

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

function dateAtOffset(today: string, offset: number) {
  const date = parse(today, "yyyy-MM-dd", new Date());
  return format(subDays(date, offset), "yyyy-MM-dd");
}

export function buildReportDays(
  report: DashboardReportDay[],
  today: string,
  windowDays = 60
): DashboardReportDay[] {
  const byDate = new Map(report.map((day) => [day.date, day]));
  return Array.from({ length: windowDays }, (_, index) => {
    const date = dateAtOffset(today, windowDays - 1 - index);
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
}

export function sliceReportPeriod(
  allDays: DashboardReportDay[],
  periodDays: number
) {
  return {
    currentDays: allDays.slice(-periodDays),
    previousDays: allDays.slice(-periodDays * 2, -periodDays),
  };
}

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

export function reportComparisonExportToCsv(
  currentDays: DashboardReportDay[],
  previousDays: DashboardReportDay[],
  periodLabel: string
): string {
  const current = summarize(currentDays);
  const previous = summarize(previousDays);
  const lines = [
    `รายงาน,${periodLabel}`,
    csvRow(["ตัวชี้วัด", "ช่วงปัจจุบัน", "ช่วงก่อนหน้า"]),
    csvRow(["ยอดขาย (ม้วน)", current.rolls, previous.rolls]),
    csvRow(["รายได้", current.revenue.toFixed(2), previous.revenue.toFixed(2)]),
    csvRow(["ต้นทุน", current.cost.toFixed(2), previous.cost.toFixed(2)]),
    csvRow([
      "กำไรขั้นต้น",
      current.profit.toFixed(2),
      previous.profit.toFixed(2),
    ]),
    "",
    csvRow(["วันที่", "ม้วน", "รายได้", "ต้นทุน", "กำไร"]),
    ...currentDays.map((row) =>
      csvRow([
        row.date,
        row.rolls,
        row.revenue.toFixed(2),
        row.cost.toFixed(2),
        row.profit.toFixed(2),
      ])
    ),
  ];

  return `\uFEFF${lines.join("\n")}`;
}
