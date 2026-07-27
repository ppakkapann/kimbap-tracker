import type { Sale } from "@/lib/types";

/** Legacy location keys (pre-platform channels) */
export type SaleChannel = "market" | "office" | "condo" | "other";

export type SalesPlatform = "storefront" | "grab" | "lineman";

export interface SalesPlatformOption {
  id: SalesPlatform;
  label: string;
  gpPercent: number;
}

export const SALES_PLATFORMS: SalesPlatformOption[] = [
  { id: "storefront", label: "Storefront (0% GP)", gpPercent: 0 },
  { id: "grab", label: "Grab (30% GP)", gpPercent: 30 },
  { id: "lineman", label: "Lineman (30% GP)", gpPercent: 30 },
];

export const SALES_PLATFORM_LABELS: Record<SalesPlatform, string> = {
  storefront: "Storefront (0% GP)",
  grab: "Grab (30% GP)",
  lineman: "Lineman (30% GP)",
};

export const SALE_CHANNEL_LABELS: Record<SaleChannel, string> = {
  market: "ตลาด",
  office: "ที่ทำงาน",
  condo: "คอนโด",
  other: "อื่นๆ",
};

export const SALE_LOCATION_BADGE_PALETTE = [
  "app-badge-success",
  "app-badge-info",
  "app-badge-warning",
  "app-badge-default",
] as const;

function locationKey(label: string): string {
  return label.toLocaleLowerCase("th").trim();
}

export function isSalesPlatform(
  channel: string | null | undefined
): channel is SalesPlatform {
  return SALES_PLATFORMS.some((platform) => platform.id === channel);
}

export function getGpPercentForChannel(
  channel: string | null | undefined
): number {
  const platform = SALES_PLATFORMS.find((item) => item.id === channel);
  return platform?.gpPercent ?? 0;
}

export function getSaleGpPercent(
  sale: Pick<Sale, "gp_percent" | "channel">
): number {
  if (sale.gp_percent != null) return sale.gp_percent;
  return getGpPercentForChannel(sale.channel);
}

export function applyGpToRevenue(
  grossRevenue: number,
  gpPercent: number
): number {
  const normalized = Math.min(100, Math.max(0, gpPercent));
  return grossRevenue * (1 - normalized / 100);
}

export function getSaleChannelLabel(
  channel: SaleChannel | string | null | undefined
): string {
  if (!channel) return "";
  if (channel in SALES_PLATFORM_LABELS) {
    return SALES_PLATFORM_LABELS[channel as SalesPlatform];
  }
  if (channel in SALE_CHANNEL_LABELS) {
    return SALE_CHANNEL_LABELS[channel as SaleChannel];
  }
  return channel.trim();
}

export function normalizeSaleLocation(
  value: string | null | undefined
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed in SALES_PLATFORM_LABELS) {
    return trimmed;
  }
  if (trimmed in SALE_CHANNEL_LABELS) {
    return SALE_CHANNEL_LABELS[trimmed as SaleChannel];
  }
  return trimmed;
}

export function collectKnownSaleLocations(
  sales: Pick<Sale, "channel" | "created_at">[]
): string[] {
  const sorted = [...sales].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const sale of sorted) {
    const label = getSaleChannelLabel(sale.channel);
    if (!label) continue;
    const key = locationKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(label);
  }

  return ordered;
}

export function getSaleLocationBadgeClass(
  location: SaleChannel | string | null | undefined,
  knownLocations: string[] = []
): string {
  const label = getSaleChannelLabel(location);
  if (!label) return "app-badge-default";

  if (isSalesPlatform(location)) {
    const palette: Record<SalesPlatform, string> = {
      storefront: "app-badge-success",
      grab: "app-badge-warning",
      lineman: "app-badge-info",
    };
    return palette[location];
  }

  const key = locationKey(label);
  const knownIndex = knownLocations.findIndex(
    (item) => locationKey(item) === key
  );
  const colorIndex =
    knownIndex >= 0 ? knownIndex : knownLocations.length;

  return SALE_LOCATION_BADGE_PALETTE[
    colorIndex % SALE_LOCATION_BADGE_PALETTE.length
  ];
}

export function summarizeSalesByChannel(
  sales: Pick<Sale, "quantity" | "channel">[]
): { channel: string; rolls: number }[] {
  const totals = new Map<string, number>();

  for (const sale of sales) {
    const label = getSaleChannelLabel(sale.channel);
    if (!label) continue;
    totals.set(label, (totals.get(label) ?? 0) + sale.quantity);
  }

  return [...totals.entries()]
    .map(([channel, rolls]) => ({ channel, rolls }))
    .sort((a, b) => b.rolls - a.rolls);
}
