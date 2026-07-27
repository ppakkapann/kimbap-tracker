import Link from "next/link";
import { formatCurrency } from "@/lib/calculations";
import type { SalesMonthChartData } from "@/lib/sales-month-chart";

const WIDTH = 1080;
const HEIGHT = 300;
const MARGIN = { top: 34, right: 22, bottom: 32, left: 42 };

function getPoint(index: number, value: number, dayCount: number, maxY: number) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  return {
    x: MARGIN.left + (index / Math.max(dayCount - 1, 1)) * plotWidth,
    y: MARGIN.top + plotHeight - (value / maxY) * plotHeight,
  };
}

function buildLinePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function SalesMonthChart({
  data,
  today,
}: {
  data: SalesMonthChartData;
  today: string;
}) {
  const maxY = Math.max(4, Math.ceil(data.maxRolls / 4) * 4);
  const plotBottom = HEIGHT - MARGIN.bottom;
  const yTicks = Array.from({ length: 5 }, (_, index) => (maxY / 4) * index);
  const visibleDayCount = data.days.filter((day) => day.date <= today).length;
  const series = data.products.map((product) => {
    const values = data.days.map(
      (day) =>
        day.segments.find((segment) => segment.productId === product.id)
          ?.quantity ?? 0
    );
    const points = values.map((value, index) =>
      getPoint(index, value, data.days.length, maxY)
    );
    const visiblePoints = points.slice(0, visibleDayCount);

    return {
      product,
      values,
      points,
      visiblePoints,
      path: buildLinePath(visiblePoints),
    };
  });

  return (
    <div className="sales-month-chart">
      <div className="sales-month-chart-head">
        <div>
          <p className="sales-month-chart-title">ยอดขายรายเดือน</p>
          <p className="sales-month-chart-subtitle">
            {data.monthLabel} · {data.monthTotalRolls} ม้วน ·{" "}
            {formatCurrency(data.monthTotalRevenue)}
          </p>
        </div>
        {data.products.length > 0 && (
          <div className="sales-month-legend">
            {data.products.map((product) => (
              <span key={product.id} className="sales-month-legend-item">
                <span
                  className="sales-month-legend-dot"
                  style={{ background: product.color }}
                  aria-hidden
                />
                {product.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="sales-line-chart-scroll">
        <div className="sales-line-chart-inner">
          <svg
            className="sales-line-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`กราฟยอดขาย ${data.monthLabel}`}
          >
          <defs>
            {series.map(({ product }) => (
              <linearGradient
                key={product.id}
                id={`sales-gradient-${product.id.replace(/[^a-zA-Z0-9-]/g, "")}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={product.color} stopOpacity="0.09" />
                <stop offset="100%" stopColor={product.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {data.days.map((day, index) => {
            if (!day.isSelected) return null;
            const point = getPoint(index, 0, data.days.length, maxY);
            return (
              <g key={`selected-${day.date}`}>
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={MARGIN.top}
                  y2={plotBottom}
                  className="sales-line-selected-line"
                />
              </g>
            );
          })}

          {yTicks.map((tick) => {
            const { y } = getPoint(0, tick, data.days.length, maxY);
            return (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={WIDTH - MARGIN.right}
                  y1={y}
                  y2={y}
                  className="sales-line-grid"
                />
                <text
                  x={MARGIN.left - 10}
                  y={y + 3}
                  textAnchor="end"
                  className="sales-line-axis-label"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {series.map(({ product, values, points, visiblePoints, path }) => {
            const gradientId = `sales-gradient-${product.id.replace(/[^a-zA-Z0-9-]/g, "")}`;
            const areaPath = `${path} L ${visiblePoints.at(-1)?.x ?? MARGIN.left} ${plotBottom} L ${visiblePoints[0]?.x ?? MARGIN.left} ${plotBottom} Z`;

            return (
              <g key={product.id}>
                <path d={areaPath} fill={`url(#${gradientId})`} />
                <path
                  d={path}
                  fill="none"
                  stroke={product.color}
                  className="sales-line-series"
                />
                {points.map((point, index) => {
                  const quantity = values[index];
                  const day = data.days[index];
                  if (quantity <= 0 || day.date > today) return null;
                  const segment = day.segments.find(
                    (item) => item.productId === product.id
                  );

                  return (
                    <g key={`${product.id}-${day.date}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="2.75"
                        fill="var(--bg-surface)"
                        stroke={product.color}
                        className="sales-line-point"
                      >
                        <title>{`${day.dayLabel} ${day.weekdayLabel} · ${product.name} · ${quantity} ม้วน · ${formatCurrency(segment?.revenue ?? 0)}`}</title>
                      </circle>
                      <text
                        x={point.x}
                        y={Math.max(point.y - 9, 13)}
                        textAnchor="middle"
                        fill={product.color}
                        className="sales-line-value"
                      >
                        {quantity}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          </svg>

          <div
            className="sales-line-date-row"
            style={{
              gridTemplateColumns: `repeat(${data.days.length}, minmax(0, 1fr))`,
              paddingLeft: `${(MARGIN.left / WIDTH) * 100}%`,
              paddingRight: `${(MARGIN.right / WIDTH) * 100}%`,
            }}
          >
            {data.days.map((day) => {
              const isFuture = day.date > today;
              const className = [
                "sales-line-date-button",
                day.date === today && "sales-line-date-button--today",
                day.isSelected && "sales-line-date-button--selected",
                isFuture && "sales-line-date-button--disabled",
              ]
                .filter(Boolean)
                .join(" ");

              return isFuture ? (
                <span key={day.date} className={className} aria-disabled="true">
                  {day.dayLabel}
                </span>
              ) : (
                <Link
                  key={day.date}
                  href={`/sales?date=${day.date}`}
                  scroll={false}
                  className={className}
                  aria-current={day.isSelected ? "date" : undefined}
                  aria-label={`ดูยอดขายวันที่ ${day.dayLabel} ${data.monthLabel}`}
                  title={day.date === today ? "วันนี้" : undefined}
                >
                  {day.dayLabel}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <p className="sales-line-chart-caption">จำนวนที่ขาย (ม้วน) · วันที่</p>
    </div>
  );
}
