"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { DashboardReport } from "@/components/dashboard/DashboardReport";
import type { DashboardReportDay, DashboardProductSale } from "@/components/dashboard/DashboardReport";
import { ReportsCostAnalysis } from "@/components/accounting/AccountingCharts";
import { ExportHubPanel } from "@/components/export/ExportHubPanel";
import type { AccountingChartsData } from "@/lib/accounting-charts";
import type { AccountingExportPayload } from "@/lib/accounting-export";
import type { DataExportPayload } from "@/lib/data-export";

const TABS = [
  { id: "analysis", label: "วิเคราะห์" },
  { id: "export", label: "ส่งออก" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function parseTab(value: string | null): Tab {
  if (value === "export") return "export";
  return "analysis";
}

export function ReportsPageClient({
  today,
  report,
  productSales,
  charts,
  exportData,
  accountingExport,
  exportMonth,
}: {
  today: string;
  report: DashboardReportDay[];
  productSales: DashboardProductSale[];
  charts: AccountingChartsData;
  exportData: DataExportPayload;
  accountingExport: AccountingExportPayload;
  exportMonth: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (id: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "analysis") {
        params.delete("tab");
        params.delete("month");
      } else {
        params.set("tab", id);
        if (!params.get("month")) {
          params.set("month", exportMonth);
        }
      }
      const qs = params.toString();
      router.push(qs ? `/reports?${qs}` : "/reports", { scroll: false });
    },
    [router, searchParams, exportMonth]
  );

  return (
    <div className="space-y-6">
      <div className="app-tabs overflow-x-auto">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`app-tab shrink-0 ${tab === item.id ? "app-tab-active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "analysis" ? (
        <AnalysisTab
          today={today}
          report={report}
          productSales={productSales}
          charts={charts}
        />
      ) : (
        <ExportHubPanel
          data={exportData}
          accountingExport={accountingExport}
          exportMonth={exportMonth}
          report={report}
          today={today}
        />
      )}
    </div>
  );
}

function AnalysisTab({
  today,
  report,
  productSales,
  charts,
}: {
  today: string;
  report: DashboardReportDay[];
  productSales: DashboardProductSale[];
  charts: AccountingChartsData;
}) {
  return (
    <>
      <DashboardReport
        today={today}
        report={report}
        productSales={productSales}
        exportHref="/reports?tab=export"
      />
      <ReportsCostAnalysis data={charts} />
    </>
  );
}
