import {
  calculateFoodCostPercent,
  getFoodCostGaugeMaxScale,
  getFoodCostStatus,
  getFoodCostStatusColor,
  getFoodCostStatusLabel,
} from "@/lib/food-cost";

type ScaleZone = {
  from: number;
  to: number;
  color: string;
  label: string;
};

function buildScaleZones(
  targetMin: number,
  targetMax: number,
  maxScale: number
): ScaleZone[] {
  const warningEnd = Math.min(targetMax + 5, maxScale);

  return [
    {
      from: 0,
      to: targetMin,
      color: "var(--accent)",
      label: "มาร์จิ้นสูง",
    },
    {
      from: targetMin,
      to: targetMax,
      color: "var(--success)",
      label: "ตามเป้าหมาย",
    },
    {
      from: targetMax,
      to: warningEnd,
      color: "var(--warning)",
      label: "สูงกว่าเป้า",
    },
    {
      from: warningEnd,
      to: maxScale,
      color: "var(--danger)",
      label: "สูงเกินเป้า",
    },
  ].filter((zone) => zone.to > zone.from);
}

function zoneFlexWeight(zone: ScaleZone) {
  return zone.to - zone.from;
}

export function FoodCostGauge({
  costPerRoll,
  sellingPrice,
  targetMin,
  targetMax,
}: {
  costPerRoll: number;
  sellingPrice: number;
  targetMin: number;
  targetMax: number;
}) {
  const hasRecipe = costPerRoll > 0;
  const hasPrice = sellingPrice > 0;
  const percent =
    hasRecipe && hasPrice
      ? calculateFoodCostPercent(costPerRoll, sellingPrice)
      : 0;
  const status = getFoodCostStatus(percent, targetMin, targetMax);
  const statusLabel = getFoodCostStatusLabel(status);
  const statusColor = getFoodCostStatusColor(status);
  const maxScale = getFoodCostGaugeMaxScale(percent, targetMax);
  const zones = buildScaleZones(targetMin, targetMax, maxScale);
  const markerPercent = Math.min(
    Math.max((percent / maxScale) * 100, 0),
    100
  );

  let emptyMessage: string | null = null;
  if (!hasRecipe) emptyMessage = "ยังไม่มีสูตร";
  else if (!hasPrice) emptyMessage = "กรอกราคาขาย";

  const ariaLabel = emptyMessage
    ? emptyMessage
    : `Food Cost ${percent.toFixed(1)}% · ${statusLabel} · เป้า ${targetMin}–${targetMax}%`;

  const detailText = emptyMessage
    ? emptyMessage
    : `${statusLabel} · เป้า ${targetMin}–${targetMax}%`;

  return (
    <div className="food-cost-bar-stat">
      <p
        className="app-stat-value"
        style={{ color: emptyMessage ? "var(--text-primary)" : statusColor }}
      >
        {emptyMessage ? "—" : `${percent.toFixed(1)}%`}
      </p>

      <div
        className={`food-cost-bar-shell${emptyMessage ? " food-cost-bar-shell--empty" : ""}`}
        role="img"
        aria-label={ariaLabel}
      >
        <div className="food-cost-bar-track">
          {zones.map((zone) => (
            <span
              key={`${zone.from}-${zone.to}`}
              className="food-cost-bar-zone"
              style={{
                flex: zoneFlexWeight(zone),
                background: zone.color,
              }}
              title={zone.label}
            />
          ))}
        </div>
        {!emptyMessage && (
          <span
            className="food-cost-bar-marker"
            style={{
              left: `${markerPercent}%`,
              borderColor: statusColor,
            }}
            aria-hidden
          />
        )}
      </div>

      <p
        className="app-stat-subvalue"
        style={{ color: emptyMessage ? undefined : statusColor }}
      >
        {detailText}
      </p>
    </div>
  );
}
