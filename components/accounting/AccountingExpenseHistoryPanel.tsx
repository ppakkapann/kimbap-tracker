"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/calculations";
import { getExpenseCategoryLabel } from "@/lib/operating-expenses";
import type { OperatingExpense } from "@/lib/types";
import { AccountingExpenseList } from "./AccountingExpenseList";

export function AccountingExpenseHistoryPanel({
  expenses,
  expenseByCategory,
}: {
  expenses: OperatingExpense[];
  expenseByCategory: { category: string; amount: number }[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const totalAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    if (!selectedCategory) return expenses;
    return expenses.filter((expense) => expense.category === selectedCategory);
  }, [expenses, selectedCategory]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]
  );

  function toggleCategory(category: string | null) {
    setSelectedCategory((current) =>
      current === category ? null : category
    );
  }

  const visibleCount = filteredExpenses.length;
  const countLabel =
    selectedCategory && visibleCount !== expenses.length
      ? `${visibleCount} / ${expenses.length} รายการ`
      : `${expenses.length} รายการ`;

  return (
    <>
      <div className="accounting-expense-history-head">
        <p>รายการเดือนนี้</p>
        <span>{countLabel}</span>
      </div>
      <div
        className={`accounting-expense-category-summary${
          expenseByCategory.length === 0
            ? " accounting-expense-category-summary--empty"
            : ""
        }`}
        role={expenseByCategory.length > 0 ? "group" : undefined}
        aria-label={
          expenseByCategory.length > 0 ? "กรองตามประเภท" : undefined
        }
      >
        {expenseByCategory.length > 0 && (
          <>
            <button
              type="button"
              aria-pressed={selectedCategory === null}
              onClick={() => setSelectedCategory(null)}
              className={`accounting-expense-category-pill${
                selectedCategory === null ? " is-active" : ""
              }`}
            >
              ทั้งหมด
              <strong>{formatCurrency(totalAmount)}</strong>
            </button>
            {expenseByCategory.map((row) => (
              <button
                key={row.category}
                type="button"
                aria-pressed={selectedCategory === row.category}
                onClick={() => toggleCategory(row.category)}
                className={`accounting-expense-category-pill${
                  selectedCategory === row.category ? " is-active" : ""
                }`}
              >
                {getExpenseCategoryLabel(row.category)}
                <strong>{formatCurrency(row.amount)}</strong>
              </button>
            ))}
          </>
        )}
      </div>
      <div className="accounting-expense-history-scroll">
        <AccountingExpenseList
          expenses={filteredExpenses}
          totalAmount={filteredTotal}
          selectedCategory={selectedCategory}
          onCategorySelect={toggleCategory}
          hasAnyExpenses={expenses.length > 0}
        />
      </div>
    </>
  );
}
