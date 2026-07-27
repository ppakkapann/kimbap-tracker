"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
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
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const VALUE_FORMAT = "yyyy-MM-dd";
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const POPOVER_WIDTH = 296;
const POPOVER_HEIGHT = 360;
const POPOVER_GAP = 8;

type TriggerRect = Pick<DOMRect, "top" | "bottom" | "left" | "width">;

function parseValue(value: string): Date {
  if (!value) return startOfDay(new Date());
  const parsed = parse(value, VALUE_FORMAT, new Date());
  return isValid(parsed) ? startOfDay(parsed) : startOfDay(new Date());
}

function toValue(date: Date): string {
  return format(date, VALUE_FORMAT);
}

function isDisabledDay(day: Date, min?: string, max?: string): boolean {
  const d = startOfDay(day);
  if (min && isBefore(d, startOfDay(parseValue(min)))) return true;
  if (max && isAfter(d, startOfDay(parseValue(max)))) return true;
  return false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getPopoverStyle(trigger: TriggerRect): {
  style: CSSProperties;
  openAbove: boolean;
} {
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
  const height = POPOVER_HEIGHT;
  const gap = POPOVER_GAP;

  let left = trigger.left + trigger.width / 2 - width / 2;
  left = clamp(left, 8, window.innerWidth - width - 8);

  const spaceBelow = window.innerHeight - trigger.bottom - gap;
  const spaceAbove = trigger.top - gap;
  const openAbove =
    spaceAbove >= height &&
    (spaceBelow < height + 24 || trigger.bottom > window.innerHeight * 0.42);

  let top = openAbove ? trigger.top - height - gap : trigger.bottom + gap;
  top = clamp(top, 8, window.innerHeight - height - 8);

  return {
    openAbove,
    style: {
      position: "fixed",
      top,
      left,
      width,
      zIndex: 10050,
    },
  };
}

export function DatePicker({
  value,
  onChange,
  label,
  min,
  max,
  className = "",
  disabled = false,
  placeholder = "เลือกวันที่",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<TriggerRect | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const [openAbove, setOpenAbove] = useState(false);
  const selected = parseValue(value);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRect) return;

    function updatePosition() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const next = getPopoverStyle(trigger);
      setOpenAbove(next.openAbove);
      setPopoverStyle(next.style);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, triggerRect, viewMonth]);

  useEffect(() => {
    if (open) setViewMonth(startOfMonth(parseValue(value)));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const displayValue = value
    ? format(selected, "d MMM yyyy", { locale: th })
    : placeholder;

  function openPicker(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (disabled) return;

    if (open) {
      setOpen(false);
      setTriggerRect(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const nextRect = {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
    };
    setTriggerRect(nextRect);
    const next = getPopoverStyle(nextRect);
    setOpenAbove(next.openAbove);
    setPopoverStyle(next.style);
    setOpen(true);
  }

  function pickDay(day: Date) {
    if (isDisabledDay(day, min, max)) return;
    onChange(toValue(day));
    setOpen(false);
    setTriggerRect(null);
  }

  const popover =
    open && triggerRect ? (
      <div
        ref={popoverRef}
        className={`app-date-picker-popover${openAbove ? " app-date-picker-popover--above" : ""}`}
        style={popoverStyle}
        role="dialog"
        aria-label="เลือกวันที่"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="app-date-picker-header">
          <button
            type="button"
            className="app-date-picker-nav"
            aria-label="เดือนก่อนหน้า"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
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
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
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

        <div className="app-date-picker-grid">
          {days.map((day) => {
            const outside = !isSameMonth(day, viewMonth);
            const selectedDay = isSameDay(day, selected);
            const today = isToday(day);
            const dayDisabled = isDisabledDay(day, min, max);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={dayDisabled}
                aria-label={format(day, "d MMMM yyyy", { locale: th })}
                aria-pressed={selectedDay}
                onClick={() => pickDay(day)}
                className={[
                  "app-date-picker-day",
                  outside && "app-date-picker-day--outside",
                  selectedDay && "app-date-picker-day--selected",
                  today && !selectedDay && "app-date-picker-day--today",
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

        <div className="app-date-picker-footer">
          <button
            type="button"
            className="app-date-picker-today"
            disabled={isDisabledDay(new Date(), min, max)}
            onClick={() => pickDay(new Date())}
          >
            วันนี้
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={`app-date-picker ${className}`.trim()}>
      {label ? (
        <span className="app-label" id={id}>
          {label}
        </span>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        className="app-date-picker-trigger app-input"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={label ? id : undefined}
        disabled={disabled}
        onClick={openPicker}
      >
        <span
          className={value ? undefined : "app-date-picker-placeholder"}
          style={value ? undefined : { color: "var(--text-muted)" }}
        >
          {displayValue}
        </span>
        <CalendarDays size={16} strokeWidth={1.75} aria-hidden />
      </button>

      {mounted && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
