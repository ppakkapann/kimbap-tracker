import {
  getSaleChannelLabel,
  getSaleLocationBadgeClass,
} from "@/lib/sales-channels";

export function SaleChannelBadge({
  channel,
  knownLocations = [],
}: {
  channel: string | null | undefined;
  knownLocations?: string[];
}) {
  const label = getSaleChannelLabel(channel);
  if (!label) return null;

  return (
    <span
      className={`sale-location-pill app-badge shrink-0 ${getSaleLocationBadgeClass(channel, knownLocations)}`}
    >
      {label}
    </span>
  );
}
