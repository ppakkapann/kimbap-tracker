import Link from "next/link";
import { formatCurrency } from "@/lib/calculations";
import type { AccountingPeriodSummary } from "@/lib/types";

type FlowCard = {
  href: string;
  label: string;
  value: string;
  subValue: string;
  variant: "default" | "success" | "warning" | "danger" | "accent";
  subVariant?: "default" | "success" | "warning" | "danger" | "accent";
};

const VALUE_COLORS: Record<FlowCard["variant"], string> = {
  default: "var(--text-primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  accent: "var(--accent)",
};

export function AccountingFlowLinks({
  summary,
}: {
  summary: AccountingPeriodSummary;
}) {
  const cards: FlowCard[] = [
    {
      href: "/sales",
      label: "รายรับจากการขาย",
      value: formatCurrency(summary.totalRevenue),
      subValue: `${summary.totalRolls} ม้วน · ดูรายการขาย`,
      variant: "accent",
    },
    {
      href: "/stock?tab=history",
      label: "ซื้อวัตถุดิบ",
      value: formatCurrency(summary.totalPurchased),
      subValue: "ดูประวัติการซื้อ",
      variant: "default",
    },
    {
      href: "/reports",
      label: "ต้นทุนขาย",
      value: formatCurrency(summary.totalUsed),
      subValue: "จากต้นทุนตัดสต็อกเมื่อขาย · ดูรายงาน",
      variant: "default",
    },
    {
      href: "#shop-expenses",
      label: "ค่าใช้จ่ายร้าน",
      value: formatCurrency(summary.totalOperatingExpenses),
      subValue: "ดูรายการด้านล่าง",
      variant: "warning",
      subVariant: "warning",
    },
  ];

  return (
    <section className="accounting-flow-links">
      <div className="accounting-summary-section-head">
        <h2>รายละเอียดเงินเข้า–ออก</h2>
        <p>แตะการ์ดเพื่อไปดูรายการ</p>
      </div>
      <div className="app-grid-stats">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="app-stat app-stat-link"
          >
            <p className="app-stat-label">{card.label}</p>
            <p
              className="app-stat-value"
              style={{ color: VALUE_COLORS[card.variant] }}
            >
              {card.value}
            </p>
            <p
              className="app-stat-subvalue"
              style={{
                color: card.subVariant
                  ? VALUE_COLORS[card.subVariant]
                  : "var(--text-muted)",
              }}
            >
              {card.subValue}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
