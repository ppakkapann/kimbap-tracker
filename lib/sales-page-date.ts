import { format, isValid, parse } from "date-fns";

export const SALES_PAGE_DATE_COOKIE = "sales-selected-date";
const SALES_PAGE_DATE_STORAGE_KEY = "sales-selected-date";

export function isValidSalesPageDate(
  value: string | null | undefined,
  today: string
): value is string {
  const trimmed = value?.trim();
  if (!trimmed) return false;

  const parsed = parse(trimmed, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return false;

  return format(parsed, "yyyy-MM-dd") === trimmed && trimmed <= today;
}

export function resolveSalesPageDate(
  dateParam: string | undefined,
  remembered: string | undefined,
  today: string
): string {
  if (isValidSalesPageDate(dateParam, today)) return dateParam.trim();
  if (isValidSalesPageDate(remembered, today)) return remembered.trim();
  return today;
}

export function rememberSalesPageDate(date: string) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(SALES_PAGE_DATE_STORAGE_KEY, date);
  } catch {
    // ignore quota / private mode
  }

  document.cookie = `${SALES_PAGE_DATE_COOKIE}=${encodeURIComponent(date)}; path=/; max-age=2592000; SameSite=Lax`;
}

export function getRememberedSalesPageDate(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const fromStorage = sessionStorage.getItem(SALES_PAGE_DATE_STORAGE_KEY);
    if (fromStorage && isValidSalesPageDate(fromStorage, format(new Date(), "yyyy-MM-dd"))) {
      return fromStorage;
    }
  } catch {
    // ignore
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SALES_PAGE_DATE_COOKIE}=([^;]*)`)
  );
  if (!match?.[1]) return null;

  const decoded = decodeURIComponent(match[1]);
  const today = format(new Date(), "yyyy-MM-dd");
  return isValidSalesPageDate(decoded, today) ? decoded : null;
}

export function salesPageHref(date?: string | null) {
  return date ? `/sales?date=${date}` : "/sales";
}
