"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/DatePicker";
import type { DashboardRangePreset } from "@/lib/dashboard-range";

const PRESETS: { value: DashboardRangePreset; label: string }[] = [
  { value: "today", label: "วันนี้" },
  { value: "week", label: "สัปดาห์นี้" },
  { value: "month", label: "เดือนนี้" },
  { value: "custom", label: "กำหนดเอง" },
];

export function DashboardDateRangePicker({
  preset,
  startDate,
  endDate,
  today,
}: {
  preset: DashboardRangePreset;
  startDate: string;
  endDate: string;
  today: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function pushRange(
    nextPreset: DashboardRangePreset,
    from?: string,
    to?: string
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextPreset);

    if (nextPreset === "custom") {
      params.set("from", from ?? startDate);
      params.set("to", to ?? endDate);
    } else {
      params.delete("from");
      params.delete("to");
    }

    router.push(`/?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="dashboard-range-picker">
      <select
        value={preset}
        onChange={(event) =>
          pushRange(event.target.value as DashboardRangePreset)
        }
        className="app-input dashboard-range-picker-select"
        aria-label="ช่วงเวลา"
      >
        {PRESETS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      {preset === "custom" && (
        <div className="dashboard-range-picker-custom">
          <DatePicker
            label="จาก"
            value={startDate}
            max={today}
            onChange={(value) => pushRange("custom", value, endDate)}
          />
          <DatePicker
            label="ถึง"
            value={endDate}
            max={today}
            onChange={(value) => pushRange("custom", startDate, value)}
          />
        </div>
      )}
    </div>
  );
}
