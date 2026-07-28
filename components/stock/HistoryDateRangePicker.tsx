"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import { DateRangeCalendar } from "@/components/ui/DateRangeCalendar";
import {
  defaultHistoryDateRange,
  monthStartFromToday,
  type HistoryDateRange,
  type HistoryRangePreset,
} from "@/lib/history-groups";

const PRESET_OPTIONS: {
  value: Exclude<HistoryRangePreset, "custom">;
  label: string;
}[] = [
  { value: "month", label: "เดือนนี้" },
  { value: "all", label: "ทั้งหมด" },
];

export function HistoryDateRangePicker({
  value,
  onChange,
  today,
}: {
  value: HistoryDateRange;
  onChange: (range: HistoryDateRange) => void;
  today: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(value.startDate);
  const [draftEnd, setDraftEnd] = useState(value.endDate);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openPicker() {
    const start =
      value.preset === "custom" && value.startDate
        ? value.startDate
        : monthStartFromToday(today);
    const end =
      value.preset === "custom" && value.endDate ? value.endDate : today;
    setDraftStart(start);
    setDraftEnd(end);
    setOpen(true);
  }

  function selectPreset(preset: Exclude<HistoryRangePreset, "custom">) {
    if (preset === "month") {
      onChange(defaultHistoryDateRange(today));
    } else {
      onChange({ preset: "all", startDate: "", endDate: "" });
    }
    setOpen(false);
  }

  function applyCustom() {
    if (!draftStart || !draftEnd || draftStart > draftEnd) return;
    onChange({
      preset: "custom",
      startDate: draftStart,
      endDate: draftEnd,
    });
    setOpen(false);
  }

  const overlay =
    open && mounted ? (
      <div
        className="history-date-range-overlay"
        onClick={() => setOpen(false)}
        role="presentation"
      >
        <div
          className="history-date-range-sheet"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="เลือกช่วงวันที่"
        >
          <span className="history-date-range-sheet-handle" aria-hidden />

          <DateRangeCalendar
            startDate={draftStart}
            endDate={draftEnd}
            onStartChange={setDraftStart}
            onEndChange={setDraftEnd}
            today={today}
          />

          <div className="history-date-range-sheet-actions">
            <button
              type="button"
              className="app-btn app-btn-secondary"
              onClick={() => setOpen(false)}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="app-btn app-btn-primary"
              disabled={!draftStart || !draftEnd || draftStart > draftEnd}
              onClick={applyCustom}
            >
              ใช้ช่วงนี้
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="history-date-range-picker">
      <div
        className="history-date-range-presets"
        role="group"
        aria-label="ช่วงเวลา"
      >
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value.preset === option.value}
            className={`history-date-range-preset${
              value.preset === option.value ? " is-active" : ""
            }`}
            onClick={() => selectPreset(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`history-date-range-calendar-icon${
          value.preset === "custom" ? " is-active" : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="เลือกช่วงวันที่"
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <CalendarDays size={18} strokeWidth={1.75} aria-hidden />
      </button>

      {overlay ? createPortal(overlay, document.body) : null}
    </div>
  );
}
