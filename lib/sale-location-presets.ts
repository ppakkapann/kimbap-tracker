import type { Sale } from "@/lib/types";
import {
  SALES_PLATFORM_LABELS,
  getSaleChannelLabel,
  isSalesPlatform,
} from "@/lib/sales-channels";

const STORAGE_KEY = "kimbap-sale-location-presets";
const MAX_PRESETS = 20;
const GP_SUFFIX =
  /^(.+?)\s*\((\d+(?:\.\d+)?)\s*%\s*GP\)\s*$/i;

export type SaleLocationPreset = {
  location: string;
  useGp: boolean;
  gpPercent: number;
  lastUsed: number;
};

function locationKey(value: string): string {
  return value.toLocaleLowerCase("th").trim();
}

function isLegacyPlatformLabel(label: string): boolean {
  const key = locationKey(label);
  return Object.values(SALES_PLATFORM_LABELS).some(
    (item) => locationKey(item) === key
  );
}

function isLegacyPlatformChannel(channel: string): boolean {
  return isSalesPlatform(channel) || channel in SALES_PLATFORM_LABELS;
}

export function formatLocationSuggestion(preset: SaleLocationPreset): string {
  if (preset.useGp && preset.gpPercent > 0) {
    const percent =
      preset.gpPercent % 1 === 0
        ? String(preset.gpPercent)
        : preset.gpPercent.toFixed(2).replace(/\.?0+$/, "");
    return `${preset.location} (${percent}% GP)`;
  }
  return preset.location;
}

export function parseLocationSuggestion(
  value: string
): Omit<SaleLocationPreset, "lastUsed"> | null {
  const match = value.trim().match(GP_SUFFIX);
  if (!match) return null;

  return {
    location: match[1].trim(),
    useGp: true,
    gpPercent: Math.min(100, Math.max(0, parseFloat(match[2]))),
  };
}

export function normalizeLocationName(value: string): string {
  const parsed = parseLocationSuggestion(value);
  if (parsed) return parsed.location;
  return value.trim();
}

export function loadSaleLocationPresets(): SaleLocationPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaleLocationPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.location === "string" &&
          item.location.trim().length > 0 &&
          !isLegacyPlatformLabel(item.location.trim())
      )
      .map((item) => ({
        location: item.location.trim(),
        useGp: Boolean(item.useGp),
        gpPercent:
          typeof item.gpPercent === "number" && item.gpPercent >= 0
            ? Math.min(100, item.gpPercent)
            : 0,
        lastUsed:
          typeof item.lastUsed === "number" ? item.lastUsed : Date.now(),
      }))
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

export function rememberSaleLocation(
  location: string,
  useGp: boolean,
  gpPercent: number
) {
  if (typeof window === "undefined") return;
  const trimmed = normalizeLocationName(location);
  if (!trimmed || isLegacyPlatformLabel(trimmed)) return;

  const key = locationKey(trimmed);
  const existing = loadSaleLocationPresets().filter(
    (item) => locationKey(item.location) !== key
  );
  const next: SaleLocationPreset[] = [
    {
      location: trimmed,
      useGp,
      gpPercent: useGp ? Math.min(100, Math.max(0, gpPercent)) : 0,
      lastUsed: Date.now(),
    },
    ...existing,
  ].slice(0, MAX_PRESETS);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function collectLocationPresetsFromSales(
  sales: Pick<Sale, "channel" | "gp_percent" | "created_at">[]
): SaleLocationPreset[] {
  const sorted = [...sales].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  const byKey = new Map<string, SaleLocationPreset>();

  for (const sale of sorted) {
    if (isLegacyPlatformChannel(sale.channel)) continue;

    const location = getSaleChannelLabel(sale.channel);
    if (!location || isLegacyPlatformLabel(location)) continue;

    const key = locationKey(location);
    if (!key || byKey.has(key)) continue;

    const gpPercent = sale.gp_percent ?? 0;
    byKey.set(key, {
      location,
      useGp: gpPercent > 0,
      gpPercent,
      lastUsed: new Date(sale.created_at).getTime(),
    });
  }

  return [...byKey.values()].sort((a, b) => b.lastUsed - a.lastUsed);
}

export function mergeAllLocationPresets(
  localPresets: SaleLocationPreset[],
  serverPresets: SaleLocationPreset[]
): SaleLocationPreset[] {
  const merged = new Map<string, SaleLocationPreset>();

  for (const preset of serverPresets) {
    merged.set(locationKey(preset.location), preset);
  }
  for (const preset of localPresets) {
    merged.set(locationKey(preset.location), preset);
  }

  return [...merged.values()].sort((a, b) => b.lastUsed - a.lastUsed);
}

export function buildLocationSuggestionValues(
  presets: SaleLocationPreset[]
): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const preset of presets) {
    const value = formatLocationSuggestion(preset);
    const key = locationKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }

  return values;
}

export function resolveLocationInput(
  value: string,
  presets: SaleLocationPreset[]
): SaleLocationPreset | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = parseLocationSuggestion(trimmed);
  if (parsed) {
    return {
      ...parsed,
      lastUsed: Date.now(),
    };
  }

  const key = locationKey(trimmed);
  return presets.find((item) => locationKey(item.location) === key) ?? null;
}

export function getPresetForLocation(
  location: string,
  presets: SaleLocationPreset[] = loadSaleLocationPresets()
): SaleLocationPreset | null {
  return resolveLocationInput(location, presets);
}
