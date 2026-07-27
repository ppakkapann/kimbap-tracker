"use client";

import { Download } from "lucide-react";

export function ExportReportButton({
  rows,
  previousRows = [],
  periodLabel = "รายงาน",
}: {
  rows: {
    date: string;
    rolls: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
  previousRows?: {
    date: string;
    rolls: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
  periodLabel?: string;
}) {
  function summarize(data: typeof rows) {
    return data.reduce(
      (sum, row) => ({
        rolls: sum.rolls + row.rolls,
        revenue: sum.revenue + row.revenue,
        cost: sum.cost + row.cost,
        profit: sum.profit + row.profit,
      }),
      { rolls: 0, revenue: 0, cost: 0, profit: 0 }
    );
  }

  function handleExport() {
    const current = summarize(rows);
    const previous = summarize(previousRows);
    const summary = [
      `รายงาน,${periodLabel}`,
      "ตัวชี้วัด,ช่วงปัจจุบัน,ช่วงก่อนหน้า",
      `ยอดขาย (ม้วน),${current.rolls},${previous.rolls}`,
      `รายได้,${current.revenue.toFixed(2)},${previous.revenue.toFixed(2)}`,
      `ต้นทุน,${current.cost.toFixed(2)},${previous.cost.toFixed(2)}`,
      `กำไรขั้นต้น,${current.profit.toFixed(2)},${previous.profit.toFixed(2)}`,
      "",
      "วันที่,ม้วน,รายได้,ต้นทุน,กำไร",
    ].join("\n");
    const body = rows
      .map(
        (r) =>
          `${r.date},${r.rolls},${r.revenue.toFixed(2)},${r.cost.toFixed(2)},${r.profit.toFixed(2)}`
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${summary}\n${body}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kimbap-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={rows.length === 0}
      className="app-btn app-btn-secondary"
    >
      <Download size={13} /> ส่งออก CSV
    </button>
  );
}
