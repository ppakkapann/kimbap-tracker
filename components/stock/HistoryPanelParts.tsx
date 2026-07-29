"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export function HistoryPanelHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="history-panel-header">
      <div className="history-panel-header-main">
        <h2 className="app-section-title mb-1">{title}</h2>
        {subtitle ? (
          <p className="history-panel-subtitle">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="history-panel-header-actions">{actions}</div>
      ) : null}
    </header>
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
      {periodToggle ? (
        <div className="history-table-period-bar">{periodToggle}</div>
      ) : null}
      <div className="history-table-scroll-x">
        <div className="history-table-head-wrap">
          <div
            className={`ingredient-grid-list history-grid-list history-grid-list--${variant}`}
          >
            <div className="ingredient-grid-head history-grid-head">{columns}</div>
          </div>
        </div>
        <div className="history-table-body-scroll">{children}</div>
      </div>
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
    <div className="history-grid-month-row max-sm:hidden">
      <span className="history-grid-month-label">{monthLabel}</span>
      <span className="history-grid-month-meta tabular-nums">{meta}</span>
    </div>
  );
}
