import {
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type DashboardRangePreset = "today" | "week" | "month" | "custom";

const DATE_FORMAT = "yyyy-MM-dd";

export interface DashboardDateRange {
  preset: DashboardRangePreset;
  startDate: string;
  endDate: string;
  label: string;
}

function parseDate(value: string | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;
  const parsed = parse(value.trim(), DATE_FORMAT, new Date());
  if (!isValid(parsed)) return fallback;
  return format(parsed, DATE_FORMAT);
}

export function resolveDashboardRange(
  rangeParam: string | undefined,
  fromParam: string | undefined,
  toParam: string | undefined,
  today: string
): DashboardDateRange {
  const preset: DashboardRangePreset =
    rangeParam === "week" ||
    rangeParam === "month" ||
    rangeParam === "custom"
      ? rangeParam
      : "today";

  const todayDate = parse(today, DATE_FORMAT, new Date());

  if (preset === "today") {
    return {
      preset,
      startDate: today,
      endDate: today,
      label: "วันนี้",
    };
  }

  if (preset === "week") {
    const start = format(
      startOfWeek(todayDate, { weekStartsOn: 1 }),
      DATE_FORMAT
    );
    const end = format(
      endOfWeek(todayDate, { weekStartsOn: 1 }),
      DATE_FORMAT
    );
    return {
      preset,
      startDate: start,
      endDate: end > today ? today : end,
      label: "สัปดาห์นี้",
    };
  }

  if (preset === "month") {
    const start = format(startOfMonth(todayDate), DATE_FORMAT);
    const end = format(endOfMonth(todayDate), DATE_FORMAT);
    return {
      preset,
      startDate: start,
      endDate: end > today ? today : end,
      label: "เดือนนี้",
    };
  }

  const from = parseDate(fromParam, today);
  const to = parseDate(toParam, today);
  const startDate = from <= to ? from : to;
  const endDate = from <= to ? to : from;

  return {
    preset: "custom",
    startDate,
    endDate,
    label: "กำหนดเอง",
  };
}

export function dashboardRangeLabel(range: DashboardDateRange): string {
  if (range.startDate === range.endDate) {
    return new Date(range.startDate).toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  const start = new Date(range.startDate).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
  const end = new Date(range.endDate).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${start} – ${end}`;
}
