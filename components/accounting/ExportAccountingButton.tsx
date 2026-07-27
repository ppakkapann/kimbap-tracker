"use client";

import { Download } from "lucide-react";
import {
  accountingExportToCsv,
  type AccountingExportPayload,
} from "@/lib/accounting-export";

export function ExportAccountingButton({
  data,
}: {
  data: AccountingExportPayload;
}) {
  const hasData =
    data.expenses.length > 0 ||
    data.summary.totalRevenue !== 0 ||
    data.summary.totalUsed !== 0 ||
    data.summary.totalOperatingExpenses !== 0;

  function handleExport() {
    const csv = accountingExportToCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kimbap-accounting-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!hasData}
      className="app-btn app-btn-secondary"
    >
      <Download size={13} /> ส่งออก CSV
    </button>
  );
}
