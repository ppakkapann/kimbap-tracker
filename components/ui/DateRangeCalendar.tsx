"use client";

import { useEffect, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

const VALUE_FORMAT = "yyyy-MM-dd";
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type PickStep = "start" | "end";

function parseValue(value: string): Date {
  if (!value) return startOfDay(new Date());
  const parsed = parse(value, VALUE_FORMAT, new Date());
  return isValid(parsed) ? startOfDay(parsed) : startOfDay(new Date());
}

function toValue(date: Date): string {
  return format(date, VALUE_FORMAT);
}

function isDisabledDay(day: Date, max?: string): boolean {
  const d = startOfDay(day);
  if (max && isAfter(d, startOfDay(parseValue(max)))) return true;
  return false;
}

function formatDayLabel(value: string): string {
  if (!value) return "เลือกวัน";
  return format(parseValue(value), "d MMM yyyy", { locale: th });
}

function isBetween(day: Date, start: string, end: string): boolean {
  if (!start || !end) return false;
  const d = startOfDay(day);
  const s = parseValue(start);
  const e = parseValue(end);
  return !isBefore(d, s) && !isAfter(d, e);
}

export function DateRangeCalendar({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  today,
  className = "",
}: {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  today: string;
  className?: string;
}) {
  const [pickStep, setPickStep] = useState<PickStep>("start");
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseValue(startDate || endDate || today))
  );

  useEffect(() => {
    if (startDate && !endDate) {
      setPickStep("end");
    } else if (startDate && endDate) {
      setPickStep("start");
    } else {
      setPickStep("start");
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const anchor = startDate || endDate || today;
    setViewMonth(startOfMonth(parseValue(anchor)));
  }, [startDate, endDate, today]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const previewEnd =
    pickStep === "end" && startDate && !endDate && hoverDate ? hoverDate : endDate;

  function pickDay(day: Date) {
    if (isDisabledDay(day, today)) return;
    const value = toValue(day);

    if (pickStep === "start") {
      onStartChange(value);
      onEndChange("");
      setPickStep("end");
      return;
    }

    if (!startDate) {
      onStartChange(value);
      onEndChange("");
      return;
    }

    if (value < startDate) {
      onEndChange(startDate);
      onStartChange(value);
    } else {
      onEndChange(value);
    }
    setPickStep("start");
    setHoverDate(null);
  }

  return (
    <div className={`app-date-range ${className}`.trim()}>
      <div className="app-date-range-tabs" role="tablist" aria-label="เลือกช่วงวันที่">
        <button
          type="button"
          role="tab"
          aria-selected={pickStep === "start"}
          className={`app-date-range-tab${pickStep === "start" ? " is-active" : ""}${
            startDate ? " has-value" : ""
          }`}
          onClick={() => setPickStep("start")}
        >
          <span className="app-date-range-tab-label">จาก</span>
          <strong>{formatDayLabel(startDate)}</strong>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pickStep === "end"}
          className={`app-date-range-tab${pickStep === "end" ? " is-active" : ""}${
            endDate ? " has-value" : ""
          }`}
          onClick={() => setPickStep("end")}
        >
          <span className="app-date-range-tab-label">ถึง</span>
          <strong>{formatDayLabel(endDate)}</strong>
        </button>
      </div>

      <div className="app-date-range-calendar">
        <div className="app-date-picker-header">
          <button
            type="button"
            className="app-date-picker-nav"
            aria-label="เดือนก่อนหน้า"
            onClick={() => setViewMonth((month) => subMonths(month, 1))}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <p className="app-date-picker-title">
            {format(viewMonth, "MMMM yyyy", { locale: th })}
          </p>
          <button
            type="button"
            className="app-date-picker-nav"
            aria-label="เดือนถัดไป"
            onClick={() => setViewMonth((month) => addMonths(month, 1))}
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="app-date-picker-weekdays">
          {WEEKDAYS.map((day) => (
            <span key={day} className="app-date-picker-weekday">
              {day}
            </span>
          ))}
        </div>

        <div
          className="app-date-picker-grid app-date-range-grid"
          onMouseLeave={() => setHoverDate(null)}
        >
          {days.map((day) => {
            const outside = !isSameMonth(day, viewMonth);
            const value = toValue(day);
            const dayDisabled = isDisabledDay(day, today);
            const isStart = startDate ? isSameDay(day, parseValue(startDate)) : false;
            const isEnd = endDate ? isSameDay(day, parseValue(endDate)) : false;
            const inRange =
              startDate &&
              previewEnd &&
              isBetween(day, startDate, previewEnd) &&
              !isStart &&
              !isEnd;
            const todayMark = isToday(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={dayDisabled}
                aria-label={format(day, "d MMMM yyyy", { locale: th })}
                onMouseEnter={() => {
                  if (pickStep === "end" && startDate && !endDate) {
                    setHoverDate(value);
                  }
                }}
                onClick={() => pickDay(day)}
                className={[
                  "app-date-picker-day",
                  "app-date-range-day",
                  outside && "app-date-picker-day--outside",
                  isStart && "app-date-range-day--start",
                  isEnd && "app-date-range-day--end",
                  inRange && "app-date-range-day--in-range",
                  todayMark && !isStart && !isEnd && "app-date-picker-day--today",
                  dayDisabled && "app-date-picker-day--disabled",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
