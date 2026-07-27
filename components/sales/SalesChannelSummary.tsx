import { formatNumber } from "@/lib/calculations";
import {
  getSaleLocationBadgeClass,
  summarizeSalesByChannel,
} from "@/lib/sales-channels";
import type { Sale } from "@/lib/types";

export function SalesChannelSummary({
  sales,
  knownLocations,
}: {
  sales: Sale[];
  knownLocations: string[];
}) {
  const rows = summarizeSalesByChannel(sales);
  if (rows.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {rows.map(({ channel, rolls }) => (
        <span
          key={channel}
          className={`app-badge inline-flex items-center gap-1.5 ${getSaleLocationBadgeClass(channel, knownLocations)}`}
        >
          {channel}
          <span className="tabular-nums font-semibold">
            {formatNumber(rolls, 0)} ม้วน
          </span>
        </span>
      ))}
    </div>
  );
}
