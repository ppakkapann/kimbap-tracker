"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Download, FileArchive } from "lucide-react";
import {
  accountingExportToCsv,
  formatAccountingMonthLabel,
  type AccountingExportPayload,
} from "@/lib/accounting-export";
import {
  dataExportFilename,
  ingredientsExportToCsv,
  movementsExportToCsv,
  purchasesExportToCsv,
  salesExportToCsv,
  type DataExportPayload,
} from "@/lib/data-export";
import { downloadBlob, downloadCsv } from "@/lib/export-download";
import {
  buildReportDays,
  reportComparisonExportToCsv,
  sliceReportPeriod,
} from "@/lib/report-export";
import type { DashboardReportDay } from "@/components/dashboard/DashboardReport";

const MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

type ReportPeriod = "week" | "month";

type ExportRow = {
  id: string;
  name: string;
  detail: string;
  count: string;
  disabled?: boolean;
  option?: React.ReactNode;
  onExport: () => void;
};

type ExportGroup = {
  id: string;
  label: string;
  rows: ExportRow[];
};

function monthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({
      value,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`,
    });
  }
  return options;
}

export function ExportHubPanel({
  data,
  accountingExport,
  exportMonth,
  report,
  today,
}: {
  data: DataExportPayload;
  accountingExport: AccountingExportPayload;
  exportMonth: string;
  report: DashboardReportDay[];
  today: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("month");
  const [zipping, setZipping] = useState(false);

  const months = useMemo(() => monthOptions(), []);
  const allReportDays = useMemo(
    () => buildReportDays(report, today),
    [report, today]
  );

  const setExportMonth = useCallback(
    (month: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "export");
      params.set("month", month);
      startTransition(() => {
        router.push(`/reports?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams, startTransition]
  );

  const reportDays = reportPeriod === "week" ? 7 : 30;
  const { currentDays, previousDays } = sliceReportPeriod(
    allReportDays,
    reportDays
  );

  const hasAccountingExport =
    accountingExport.expenses.length > 0 ||
    accountingExport.summary.totalRevenue !== 0 ||
    accountingExport.summary.totalUsed !== 0 ||
    accountingExport.summary.totalOperatingExpenses !== 0;

  const hasAnyExport =
    data.sales.length > 0 ||
    data.purchases.length > 0 ||
    data.ingredients.length > 0 ||
    data.movements.length > 0 ||
    hasAccountingExport ||
    currentDays.some((day) => day.rolls > 0);

  const groups: ExportGroup[] = [
    {
      id: "accounting",
      label: "สำหรับบัญชี / ส่งสำนักงาน",
      rows: [
        {
          id: "accounting-summary",
          name: "สรุปบัญชีรายเดือน",
          detail: "รายได้ · ต้นทุน · กำไร · ค่าใช้จ่ายร้าน",
          count: `${accountingExport.expenses.length} รายจ่าย`,
          disabled: !hasAccountingExport,
          option: (
            <select
              value={exportMonth}
              onChange={(event) => setExportMonth(event.target.value)}
              className="app-input export-hub-option-select"
              aria-label="เลือกเดือนสำหรับส่งออกบัญชี"
            >
              {months.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ),
          onExport: () =>
            downloadCsv(
              `kimbap-accounting-${exportMonth}.csv`,
              accountingExportToCsv(accountingExport)
            ),
        },
        {
          id: "sales",
          name: "ยอดขายรายรายการ",
          detail: "เมนู · ช่องทาง · GP · รายได้ · ต้นทุน · กำไร",
          count: `${data.sales.length} รายการ`,
          disabled: data.sales.length === 0,
          onExport: () =>
            downloadCsv(
              dataExportFilename("sales", data.exportedAt),
              salesExportToCsv(data.sales)
            ),
        },
        {
          id: "purchases",
          name: "ประวัติซื้อวัตถุดิบ",
          detail: "วันที่ · yield · ราคา · ซัพพลายเออร์",
          count: `${data.purchases.length} รายการ`,
          disabled: data.purchases.length === 0,
          onExport: () =>
            downloadCsv(
              dataExportFilename("purchases", data.exportedAt),
              purchasesExportToCsv(data.purchases)
            ),
        },
      ],
    },
    {
      id: "stock",
      label: "สต็อก & ข้อมูลหลัก",
      rows: [
        {
          id: "ingredients",
          name: "วัตถุดิบ + สต็อกคงเหลือ",
          detail: "ประเภท · สต็อก · ต้นทุนเฉลี่ย · มูลค่าคงคลัง",
          count: `${data.ingredients.length} รายการ`,
          disabled: data.ingredients.length === 0,
          onExport: () =>
            downloadCsv(
              dataExportFilename("ingredients", data.exportedAt),
              ingredientsExportToCsv(data.ingredients)
            ),
        },
        {
          id: "movements",
          name: "การเคลื่อนไหวสต็อก",
          detail: "ซื้อ · ขาย · ตัดออก · ตรวจนับ",
          count: `${data.movements.length} รายการ`,
          disabled: data.movements.length === 0,
          onExport: () =>
            downloadCsv(
              dataExportFilename("stock-movements", data.exportedAt),
              movementsExportToCsv(data.movements)
            ),
        },
      ],
    },
    {
      id: "reports",
      label: "รายงานสรุป",
      rows: [
        {
          id: "comparison",
          name: "เปรียบเทียบผลประกอบการ",
          detail: "สรุป + รายวัน · ม้วน · รายได้ · ต้นทุน · กำไร",
          count: `${currentDays.filter((day) => day.rolls > 0).length} วัน`,
          disabled: currentDays.every((day) => day.rolls === 0),
          option: (
            <div
              className="export-hub-period-toggle"
              role="group"
              aria-label="ช่วงรายงาน"
            >
              <button
                type="button"
                className={reportPeriod === "week" ? "is-active" : ""}
                aria-pressed={reportPeriod === "week"}
                onClick={() => setReportPeriod("week")}
              >
                7 วัน
              </button>
              <button
                type="button"
                className={reportPeriod === "month" ? "is-active" : ""}
                aria-pressed={reportPeriod === "month"}
                onClick={() => setReportPeriod("month")}
              >
                30 วัน
              </button>
            </div>
          ),
          onExport: () =>
            downloadCsv(
              `kimbap-report-${reportPeriod === "week" ? "7d" : "30d"}-${data.exportedAt.slice(0, 10)}.csv`,
              reportComparisonExportToCsv(
                currentDays,
                previousDays,
                reportPeriod === "week" ? "7 วันล่าสุด" : "30 วันล่าสุด"
              )
            ),
        },
      ],
    },
  ];

  async function handleDownloadAll() {
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const date = data.exportedAt.slice(0, 10);

      if (data.sales.length > 0) {
        zip.file(
          dataExportFilename("sales", data.exportedAt),
          salesExportToCsv(data.sales)
        );
      }
      if (data.purchases.length > 0) {
        zip.file(
          dataExportFilename("purchases", data.exportedAt),
          purchasesExportToCsv(data.purchases)
        );
      }
      if (data.ingredients.length > 0) {
        zip.file(
          dataExportFilename("ingredients", data.exportedAt),
          ingredientsExportToCsv(data.ingredients)
        );
      }
      if (data.movements.length > 0) {
        zip.file(
          dataExportFilename("stock-movements", data.exportedAt),
          movementsExportToCsv(data.movements)
        );
      }
      if (hasAccountingExport) {
        zip.file(
          `kimbap-accounting-${exportMonth}.csv`,
          accountingExportToCsv(accountingExport)
        );
      }

      const weekSlice = sliceReportPeriod(allReportDays, 7);
      const monthSlice = sliceReportPeriod(allReportDays, 30);
      if (weekSlice.currentDays.some((day) => day.rolls > 0)) {
        zip.file(
          `kimbap-report-7d-${date}.csv`,
          reportComparisonExportToCsv(
            weekSlice.currentDays,
            weekSlice.previousDays,
            "7 วันล่าสุด"
          )
        );
      }
      if (monthSlice.currentDays.some((day) => day.rolls > 0)) {
        zip.file(
          `kimbap-report-30d-${date}.csv`,
          reportComparisonExportToCsv(
            monthSlice.currentDays,
            monthSlice.previousDays,
            "30 วันล่าสุด"
          )
        );
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(`kimbap-export-${date}.zip`, blob);
    } finally {
      setZipping(false);
    }
  }

  return (
    <section className="export-hub app-card">
      <div className="export-hub-hero">
        <div className="export-hub-hero-copy">
          <h2 className="app-section-title mb-0">ดาวน์โหลดครบชุด</h2>
          <p className="export-hub-subtitle mb-0">
            ZIP รวม CSV ทุกประเภท
          </p>
        </div>
        <button
          type="button"
          className="app-btn app-btn-primary export-hub-hero-btn"
          disabled={!hasAnyExport || zipping}
          onClick={() => void handleDownloadAll()}
        >
          <FileArchive size={16} aria-hidden />
          {zipping ? "กำลังบีบอัด…" : "ดาวน์โหลด ZIP"}
        </button>
      </div>

      <div className="export-hub-table-wrap">
        <table className="export-hub-table">
          <thead>
            <tr>
              <th scope="col">ไฟล์</th>
              <th scope="col" className="export-hub-col-detail">
                รายละเอียด
              </th>
              <th scope="col" className="export-hub-col-count">
                จำนวน
              </th>
              <th scope="col" className="export-hub-col-option">
                ตัวเลือก
              </th>
              <th scope="col" className="export-hub-col-action">
                <span className="sr-only">ดาวน์โหลด</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <ExportGroupRows key={group.id} group={group} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExportGroupRows({ group }: { group: ExportGroup }) {
  return (
    <>
      <tr className="export-hub-table-group">
        <th scope="rowgroup" colSpan={5}>
          {group.label}
        </th>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.id}>
          <th scope="row" className="export-hub-table-name">
            <span className="export-hub-table-name-text">{row.name}</span>
            <span className="export-hub-table-detail-mobile">
              {row.detail} · {row.count}
            </span>
          </th>
          <td className="export-hub-table-detail export-hub-col-detail">
            {row.detail}
          </td>
          <td className="export-hub-table-count export-hub-col-count tabular-nums">
            {row.count}
          </td>
          <td className="export-hub-col-option">
            {row.option ?? <span className="export-hub-table-empty">—</span>}
          </td>
          <td className="export-hub-col-action">
            <button
              type="button"
              className="export-hub-download-btn"
              disabled={row.disabled}
              onClick={row.onExport}
            >
              <Download size={14} aria-hidden />
              CSV
            </button>
          </td>
        </tr>
      ))}
    </>
  );
}

export function ExportHubLink({
  href,
  label = "ส่งออกข้อมูล",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link href={href} className="app-btn app-btn-secondary export-hub-link">
      <Download size={13} aria-hidden />
      {label}
    </Link>
  );
}
