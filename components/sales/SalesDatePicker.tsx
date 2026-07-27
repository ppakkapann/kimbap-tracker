"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui";
import { rememberSalesPageDate } from "@/lib/sales-page-date";

export function SalesDatePicker({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <DatePicker
      className="w-auto min-w-[10.5rem]"
      value={selectedDate}
      max={today}
      onChange={(date) => {
        rememberSalesPageDate(date);
        router.push(`/sales?date=${date}`);
      }}
    />
  );
}
