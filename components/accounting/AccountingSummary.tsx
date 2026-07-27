import { StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/calculations";
import type { AccountingPeriodSummary } from "@/lib/types";

export function AccountingSummary({
  summary,
  hasUntrackedExpenses,
}: {
  summary: AccountingPeriodSummary;
  hasUntrackedExpenses: boolean;
}) {
  return (
    <section className="accounting-summary">
      <div className="accounting-section-heading">
        <div>
          <h2>งบกำไรขาดทุน</h2>
          <p>ตัวเลขทางการเงินของเดือนที่เลือก</p>
        </div>
      </div>

      <div className="app-grid-stats">
        <StatCard
          label="รายได้"
          value={formatCurrency(summary.totalRevenue)}
          subValue={`${summary.totalRolls} ม้วน`}
          variant="accent"
        />
        <StatCard
          label="ต้นทุนขาย"
          value={formatCurrency(summary.totalUsed)}
      subValue="ต้นทุนวัตถุดิบจากการตัดสต็อกเมื่อขาย"
        />
        <StatCard
          label="ค่าใช้จ่ายร้าน"
          value={formatCurrency(summary.totalOperatingExpenses)}
          subValue={
            summary.laborExpenses > 0
              ? `รวมค่าแรง ${formatCurrency(summary.laborExpenses)}`
              : "เช่า ไฟ ขนส่ง การตลาด และอื่นๆ"
          }
          variant="warning"
        />
        <StatCard
          label={
            summary.estimatedNetProfit >= 0
              ? "กำไรสุทธิโดยประมาณ"
              : "ขาดทุนสุทธิโดยประมาณ"
          }
          value={formatCurrency(summary.estimatedNetProfit)}
          subValue="หลังหักต้นทุนขาย ของเสีย และค่าใช้จ่ายร้าน"
          variant={summary.estimatedNetProfit >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="accounting-summary-equation">
        <span>{formatCurrency(summary.totalRevenue)}</span>
        <span className="accounting-summary-equation-op">−</span>
        <span>{formatCurrency(summary.totalUsed)}</span>
        <span className="accounting-summary-equation-op">−</span>
        <span>{formatCurrency(summary.totalWaste)}</span>
        <span className="accounting-summary-equation-op">−</span>
        <span>{formatCurrency(summary.totalOperatingExpenses)}</span>
        <span className="accounting-summary-equation-op">=</span>
        <strong>{formatCurrency(summary.estimatedNetProfit)}</strong>
      </div>

      <p className="accounting-summary-equation-labels">
        รายได้ − ต้นทุนขาย − ของเสีย − ค่าใช้จ่ายร้าน = กำไรสุทธิ
      </p>

      {hasUntrackedExpenses && (
        <p className="accounting-summary-hint">
          ยังไม่มีค่าใช้จ่ายร้าน — บันทึกด้านล่างเพื่อให้กำไรสุทธิใกล้ความจริง
        </p>
      )}
    </section>
  );
}
