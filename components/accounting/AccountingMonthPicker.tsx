"use client";

import { useRouter } from "next/navigation";

const MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function AccountingMonthPicker({
  selectedMonth,
}: {
  selectedMonth: string;
}) {
  const router = useRouter();

  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
    options.push({ value, label });
  }

  return (
    <select
      value={selectedMonth}
      onChange={(e) => router.push(`/accounting?month=${e.target.value}`)}
      className="app-input w-auto min-w-[140px]"
      aria-label="เลือกเดือน"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
