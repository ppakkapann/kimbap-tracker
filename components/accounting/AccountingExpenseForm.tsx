"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatePicker, Input, NumberInput } from "@/components/ui";
import { recordOperatingExpense } from "@/lib/actions";
import { parseFormattedNumber } from "@/lib/calculations";
import { getPackagingExpenseHint, mergeExpenseCategorySuggestions } from "@/lib/operating-expenses";

export function AccountingExpenseForm({
  defaultDate,
  knownCategories = [],
}: {
  defaultDate: string;
  knownCategories?: string[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const packagingHint = getPackagingExpenseHint(category);
  const categorySuggestions = mergeExpenseCategorySuggestions(knownCategories);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const parsedAmount = parseFormattedNumber(amount);
    const result = await recordOperatingExpense({
      expense_date: date,
      category: category.trim(),
      amount: parsedAmount ?? 0,
      note: note || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setCategory("");
    setAmount("");
    setNote("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="accounting-expense-form">
      <div className="accounting-expense-amount-hero">
        <p className="app-stat-label">จำนวนเงิน</p>
        <div className="accounting-expense-amount-field">
          <span className="accounting-expense-amount-prefix" aria-hidden>
            ฿
          </span>
          <NumberInput
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            required
            aria-label="จำนวนเงิน"
            className="accounting-expense-amount-input"
            decimals={2}
            plain
          />
        </div>
      </div>

      <div className="accounting-expense-form-fields">
        <Input
          label="ประเภท"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          list={
            categorySuggestions.length > 0
              ? "accounting-expense-category-suggestions"
              : undefined
          }
          placeholder="เช่น ค่าเช่า, ค่าเดินทาง"
          required
        />
        {categorySuggestions.length > 0 && (
          <datalist id="accounting-expense-category-suggestions">
            {categorySuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        )}

        <DatePicker label="วันที่จ่าย" value={date} onChange={setDate} />

        <Input
          label="รายละเอียด (ไม่บังคับ)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="เช่น สติกเกอร์โลโก้รอบเดือน"
        />
      </div>

      {packagingHint && (
        <p className="accounting-expense-category-hint">{packagingHint}</p>
      )}
      {error && <p className="accounting-expense-error">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="app-btn app-btn-primary accounting-expense-submit"
      >
        {loading ? "กำลังบันทึก..." : "บันทึกค่าใช้จ่าย"}
      </button>
    </form>
  );
}
