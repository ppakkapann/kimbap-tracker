import type {
  AccountingPeriodSummary,
  OperatingExpense,
} from "./types";
import { getExpenseCategoryLabel } from "./operating-expenses";

const THAI_MONTHS = [
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

export function formatAccountingMonthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return `${THAI_MONTHS[mon - 1]} ${year + 543}`;
}

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

export interface AccountingExportPayload {
  month: string;
  monthLabel: string;
  summary: AccountingPeriodSummary;
  expenses: {
    expenseDate: string;
    category: string;
    amount: number;
    note: string;
  }[];
}

export function buildAccountingExportPayload(
  month: string,
  summary: AccountingPeriodSummary,
  operatingExpenses: OperatingExpense[] = []
): AccountingExportPayload {
  return {
    month,
    monthLabel: formatAccountingMonthLabel(month),
    summary,
    expenses: operatingExpenses.map((expense) => ({
      expenseDate: expense.expense_date,
      category: getExpenseCategoryLabel(expense.category),
      amount: expense.amount,
      note: expense.note ?? "",
    })),
  };
}

export function accountingExportToCsv(data: AccountingExportPayload): string {
  const lines: string[] = [];
  const { monthLabel, summary } = data;

  lines.push(`สรุปบัญชี ${monthLabel}`);
  lines.push(csvRow(["รายการ", "จำนวน (บาท)"]));
  lines.push(csvRow(["รายได้จากการขาย", summary.totalRevenue.toFixed(2)]));
  lines.push(csvRow(["จำนวนที่ขาย (ม้วน)", summary.totalRolls]));
  lines.push(csvRow(["ซื้อวัตถุดิบ", summary.totalPurchased.toFixed(2)]));
  lines.push(csvRow(["ต้นทุนขาย", summary.totalUsed.toFixed(2)]));
  lines.push(csvRow(["กำไรขั้นต้น", summary.totalProfit.toFixed(2)]));
  lines.push(
    csvRow(["ค่าใช้จ่ายร้าน", summary.totalOperatingExpenses.toFixed(2)])
  );
  lines.push(
    csvRow(["กำไรสุทธิโดยประมาณ", summary.estimatedNetProfit.toFixed(2)])
  );
  lines.push("");

  lines.push(`ค่าใช้จ่ายร้าน ${monthLabel}`);
  lines.push(csvRow(["วันที่", "ประเภท", "จำนวน (บาท)", "รายละเอียด"]));
  for (const expense of data.expenses) {
    lines.push(
      csvRow([
        expense.expenseDate,
        expense.category,
        expense.amount.toFixed(2),
        expense.note,
      ])
    );
  }

  return `\uFEFF${lines.join("\n")}`;
}
