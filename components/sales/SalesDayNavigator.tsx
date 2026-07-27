"use client";

import { useRouter } from "next/navigation";
import { addDays, format, parse, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rememberSalesPageDate } from "@/lib/sales-page-date";

export function SalesDayNavigator({
  selectedDate,
  today,
}: {
  selectedDate: string;
  today: string;
}) {
  const router = useRouter();
  const current = parse(selectedDate, "yyyy-MM-dd", new Date());
  const prevDate = format(subDays(current, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(current, 1), "yyyy-MM-dd");
  const canGoNext = nextDate <= today;

  function goTo(date: string) {
    rememberSalesPageDate(date);
    router.push(`/sales?date=${date}`, { scroll: false });
  }

  return (
    <div className="sales-day-nav" aria-label="เลื่อนวันที่ขาย">
      <button
        type="button"
        className="sales-day-nav-arrow"
        onClick={() => goTo(prevDate)}
        aria-label="วันก่อนหน้า"
      >
        <ChevronLeft size={15} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className="sales-day-nav-arrow"
        disabled={!canGoNext}
        onClick={() => canGoNext && goTo(nextDate)}
        aria-label="วันถัดไป"
      >
        <ChevronRight size={15} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
