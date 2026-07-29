import { format } from "date-fns";
import { AccountingFlowLinks } from "@/components/accounting/AccountingFlowLinks";
import { AccountingWaterfall } from "@/components/accounting/AccountingCharts";
import { AccountingExpenseForm } from "@/components/accounting/AccountingExpenseForm";
import { AccountingExpenseHistoryPanel } from "@/components/accounting/AccountingExpenseHistoryPanel";
import { AccountingMonthPicker } from "@/components/accounting/AccountingMonthPicker";
import { AccountingSummary } from "@/components/accounting/AccountingSummary";
import { ExportHubLink } from "@/components/export/ExportHubPanel";
import { PageHeader } from "@/components/ui";
import { formatAccountingMonthLabel } from "@/lib/accounting-export";
import { formatCurrency } from "@/lib/calculations";
import { mergeExpenseCategorySuggestions } from "@/lib/operating-expenses";
import { fetchAccountingPage } from "@/lib/queries";

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = today.slice(0, 7);
  const month = monthParam || currentMonth;
  const monthLabel = formatAccountingMonthLabel(month);

  const {
    summary,
    charts,
    operatingExpenses,
    allOperatingExpenses,
  } = await fetchAccountingPage(month);

  const knownExpenseCategories = mergeExpenseCategorySuggestions(
    allOperatingExpenses.map((expense) => expense.category)
  );

  const defaultExpenseDate =
    month === currentMonth ? today : `${month}-01`;
  const expenseByCategory = [
    ...operatingExpenses.reduce((map, expense) => {
      map.set(
        expense.category,
        (map.get(expense.category) ?? 0) + expense.amount
      );
      return map;
    }, new Map<string, number>()),
  ]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const hasUntrackedExpenses = operatingExpenses.length === 0;

  const expensesSection = (
    <section id="shop-expenses" className="accounting-quick-expenses">
      <div className="accounting-tab-intro">
        <div>
          <h2>ค่าใช้จ่ายร้าน · บันทึกเร็ว</h2>
          <p>ค่าใช้จ่ายนอกเหนือจากการซื้อวัตถุดิบ</p>
        </div>
        <strong>{formatCurrency(summary.totalOperatingExpenses)}</strong>
      </div>
      <div className="accounting-expenses-grid">
        <div className="accounting-expense-entry-panel">
          <div className="accounting-expense-history-head">
            <p>บันทึกรายจ่าย</p>
            <span>ค่าใช้จ่ายร้าน</span>
          </div>
          <div className="accounting-expense-entry-body">
            <AccountingExpenseForm
              defaultDate={defaultExpenseDate}
              knownCategories={knownExpenseCategories}
            />
          </div>
        </div>
        <div className="accounting-expense-history">
          <div className="accounting-expense-history-panel">
            <AccountingExpenseHistoryPanel
              expenses={operatingExpenses}
              expenseByCategory={expenseByCategory}
            />
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div>
      <PageHeader
        title="การเงิน"
        subtitle={monthLabel}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportHubLink
              href={`/reports?tab=export&month=${month}`}
              label="ส่งออก"
            />
            <AccountingMonthPicker selectedMonth={month} />
          </div>
        }
      />

      <AccountingSummary
        summary={summary}
        hasUntrackedExpenses={hasUntrackedExpenses}
      />

      <AccountingFlowLinks summary={summary} />

      <AccountingWaterfall data={charts.waterfall} />

      {expensesSection}

      <p className="accounting-page-footnote">
        รายได้และต้นทุนขายมาจากยอดขาย · การซื้อวัตถุดิบบันทึกที่ + เติมสต็อก ·
        ค่าใช้จ่ายร้านบันทึกด้านล่าง
      </p>
    </div>
  );
}
