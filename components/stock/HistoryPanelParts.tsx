"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { SegmentToggle } from "@/components/ui";
import type { HistoryPeriod } from "@/lib/history-groups";

const PERIOD_OPTIONS: { value: HistoryPeriod; label: string }[] = [
  { value: "month", label: "เดือนนี้" },
  { value: "quarter", label: "3 เดือน" },
  { value: "all", label: "ทั้งหมด" },
];

export function HistoryPeriodToggle({
  value,
  onChange,
}: {
  value: HistoryPeriod;
  onChange: (period: HistoryPeriod) => void;
}) {
  return (
    <SegmentToggle
      className="app-segment-toggle--inline"
      ariaLabel="ช่วงเวลา"
      value={value}
      onChange={onChange}
      options={PERIOD_OPTIONS}
    />
  );
}

export function HistoryMonthHeader({
  monthKey,
  meta,
}: {
  monthKey: string;
  meta: string;
}) {
  const monthDate = new Date(`${monthKey}-01`);
  const monthLabel = format(monthDate, "MMMM yyyy", { locale: th });

  return (
    <header className="history-month-head">
      <h3 className="history-month-title">{monthLabel}</h3>
      <span className="history-month-meta tabular-nums">{meta}</span>
    </header>
  );
}

export function HistoryTableShell({
  variant,
  columns,
  children,
  footer,
  periodToggle,
}: {
  variant: "movement" | "purchase";
  columns: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  periodToggle?: ReactNode;
}) {
  return (
    <div className="history-table-shell">
      <div className="history-table-head-wrap">
        {periodToggle ? (
          <div className="history-table-period-bar">{periodToggle}</div>
        ) : null}
        <div
          className={`ingredient-grid-list history-grid-list history-grid-list--${variant}`}
        >
          <div className="ingredient-grid-head history-grid-head">{columns}</div>
        </div>
      </div>
      <div className="history-table-body-scroll">{children}</div>
      {footer}
    </div>
  );
}

export function HistoryTableMonthRow({
  monthKey,
  meta,
}: {
  monthKey: string;
  meta: string;
}) {
  const monthDate = new Date(`${monthKey}-01`);
  const monthLabel = format(monthDate, "MMMM yyyy", { locale: th });

  return (
    <div className="history-grid-month-row">
      <span className="history-grid-month-label">{monthLabel}</span>
      <span className="history-grid-month-meta tabular-nums">{meta}</span>
    </div>
  );
}
