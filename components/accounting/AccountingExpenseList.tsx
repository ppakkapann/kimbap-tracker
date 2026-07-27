"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteOperatingExpense } from "@/lib/actions";
import { formatCurrency } from "@/lib/calculations";
import { getExpenseCategoryLabel } from "@/lib/operating-expenses";
import type { OperatingExpense } from "@/lib/types";

export function AccountingExpenseList({
  expenses,
  totalAmount,
  selectedCategory = null,
  onCategorySelect,
  hasAnyExpenses = true,
}: {
  expenses: OperatingExpense[];
  totalAmount: number;
  selectedCategory?: string | null;
  onCategorySelect?: (category: string) => void;
  hasAnyExpenses?: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");
    const result = await deleteOperatingExpense(id);
    setDeletingId(null);
    setPendingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const sortedExpenses = [...expenses].sort(
    (a, b) =>
      b.expense_date.localeCompare(a.expense_date) ||
      b.created_at.localeCompare(a.created_at)
  );

  const itemCount = sortedExpenses.length;

  if (!hasAnyExpenses) {
    return (
      <div className="accounting-expense-table-shell">
        <div className="app-table-wrap accounting-expense-table-head-wrap">
          <table className="app-table app-table-compact accounting-expense-table min-w-[420px]">
            <colgroup>
              <col className="accounting-expense-col-date" />
              <col />
              <col />
              <col className="accounting-expense-col-amount" />
              <col className="accounting-expense-col-action" />
            </colgroup>
            <thead>
              <tr>
                <th className="accounting-expense-col-date">วันที่</th>
                <th>ประเภท</th>
                <th>รายละเอียด</th>
                <th className="cell-right">จำนวนเงิน</th>
                <th
                  className="accounting-expense-col-action"
                  aria-label="จัดการ"
                />
              </tr>
            </thead>
          </table>
        </div>
        <div className="app-table-wrap accounting-expense-table-body-scroll">
          <div className="accounting-expense-empty">
            <p>ยังไม่มีค่าใช้จ่ายร้านในเดือนนี้</p>
            <span>
              เพิ่มค่าเดินทาง บรรจุภัณฑ์ ค่าเช่า หรือค่าใช้จ่ายอื่นด้านซ้าย
            </span>
          </div>
        </div>
        <div className="accounting-expense-table-footer">
          <p className="app-table-footer-label accounting-expense-table-footer-label">
            รวม 0 รายการ
          </p>
          <p className="app-table-footer-value accounting-expense-table-footer-value">
            {formatCurrency(0)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="accounting-expense-table-shell">
      {error && <p className="accounting-expense-list-error">{error}</p>}
      <div className="app-table-wrap accounting-expense-table-head-wrap">
        <table className="app-table app-table-compact accounting-expense-table min-w-[420px]">
          <colgroup>
            <col className="accounting-expense-col-date" />
            <col />
            <col />
            <col className="accounting-expense-col-amount" />
            <col className="accounting-expense-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th className="accounting-expense-col-date">วันที่</th>
              <th>ประเภท</th>
              <th>รายละเอียด</th>
              <th className="cell-right">จำนวนเงิน</th>
              <th className="accounting-expense-col-action" aria-label="จัดการ" />
            </tr>
          </thead>
        </table>
      </div>
      <div className="app-table-wrap accounting-expense-table-body-scroll">
        {itemCount === 0 ? (
          <div className="accounting-expense-empty accounting-expense-empty--filtered">
            <p>ไม่มีรายการในประเภทนี้</p>
            <span>ลองเลือกประเภทอื่นหรือกด ทั้งหมด</span>
          </div>
        ) : (
          <table className="app-table app-table-compact accounting-expense-table min-w-[420px]">
            <colgroup>
              <col className="accounting-expense-col-date" />
              <col />
              <col />
              <col className="accounting-expense-col-amount" />
              <col className="accounting-expense-col-action" />
            </colgroup>
            <tbody>
              {sortedExpenses.map((expense) => {
                const isPending = pendingId === expense.id;
                const isDeleting = deletingId === expense.id;
                const categoryLabel = getExpenseCategoryLabel(expense.category);
                const isCategoryActive = selectedCategory === expense.category;
                const dateLabel = new Date(
                  `${expense.expense_date}T12:00:00`
                ).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                });

                return (
                  <Fragment key={expense.id}>
                    <tr
                      className={
                        isPending ? "accounting-expense-row--confirm" : undefined
                      }
                    >
                      <td className="cell-numeric accounting-expense-date">
                        {dateLabel}
                      </td>
                      <td>
                        <button
                          type="button"
                          aria-pressed={isCategoryActive}
                          onClick={() => onCategorySelect?.(expense.category)}
                          className={`accounting-expense-category-pill accounting-expense-category-pill--row${
                            isCategoryActive ? " is-active" : ""
                          }`}
                        >
                          {categoryLabel}
                        </button>
                      </td>
                      <td className="cell-muted accounting-expense-note">
                        {expense.note?.trim() || "—"}
                      </td>
                      <td className="cell-numeric cell-right accounting-expense-amount">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="accounting-expense-col-action">
                        {!isPending && (
                          <button
                            type="button"
                            aria-label={`ลบค่าใช้จ่าย ${categoryLabel}`}
                            disabled={isDeleting}
                            onClick={() => {
                              setError("");
                              setPendingId(expense.id);
                            }}
                            className="accounting-expense-delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isPending && (
                      <tr className="accounting-expense-confirm-row">
                        <td colSpan={5}>
                          <div className="accounting-expense-confirm">
                            <p>
                              ลบรายการนี้?{" "}
                              <strong>{formatCurrency(expense.amount)}</strong>
                            </p>
                            <div className="accounting-expense-confirm-actions">
                              <button
                                type="button"
                                className="app-btn app-btn-secondary app-btn-sm"
                                disabled={isDeleting}
                                onClick={() => setPendingId(null)}
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                className="app-btn app-btn-danger app-btn-sm"
                                disabled={isDeleting}
                                onClick={() => handleDelete(expense.id)}
                              >
                                {isDeleting ? "กำลังลบ..." : "ลบ"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="accounting-expense-table-footer">
        <p className="app-table-footer-label accounting-expense-table-footer-label">
          รวม {itemCount} รายการ
        </p>
        <p className="app-table-footer-value accounting-expense-table-footer-value">
          {formatCurrency(totalAmount)}
        </p>
      </div>
    </div>
  );
}
