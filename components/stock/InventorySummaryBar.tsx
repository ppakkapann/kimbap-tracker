import { formatNumber } from "@/lib/calculations";
import type { InventorySummary } from "@/lib/stock-analysis";

export function InventorySummaryBar({
  summary,
}: {
  summary: InventorySummary;
}) {
  return (
    <div className="app-grid-stats">
      <div className="app-stat">
        <p className="app-stat-label">วัตถุดิบทั้งหมด</p>
        <p className="app-stat-value">{formatNumber(summary.total, 0)} รายการ</p>
      </div>
      <div className="app-stat">
        <p className="app-stat-label">ปกติ</p>
        <p className="app-stat-value" style={{ color: "var(--success)" }}>
          {formatNumber(summary.okCount, 0)}
        </p>
      </div>
      <div className="app-stat">
        <p className="app-stat-label">ใกล้หมด</p>
        <p
          className="app-stat-value"
          style={{ color: summary.lowCount > 0 ? "var(--warning)" : undefined }}
        >
          {formatNumber(summary.lowCount, 0)}
        </p>
      </div>
      <div className="app-stat">
        <p className="app-stat-label">หมด</p>
        <p
          className="app-stat-value"
          style={{ color: summary.outCount > 0 ? "var(--danger)" : undefined }}
        >
          {formatNumber(summary.outCount, 0)}
        </p>
      </div>
    </div>
  );
}
