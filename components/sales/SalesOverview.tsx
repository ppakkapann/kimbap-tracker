"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { SALES_OVERVIEW_TOTAL_COLOR } from "@/lib/sales-month-chart";
import type {
  SalesOverviewData,
  SalesOverviewMode,
} from "@/lib/sales-overview";

type SalesOverviewSelection = "menus" | "all" | string;

const WIDTH = 960;
const HEIGHT = 280;
const MARGIN = { top: 20, right: 48, bottom: 12, left: 16 };
const MODES: SalesOverviewMode[] = ["day", "week", "year"];

function pointAt(index: number, value: number, count: number, maxY: number) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  return {
    x: MARGIN.left + (index / Math.max(count - 1, 1)) * plotWidth,
    y: MARGIN.top + plotHeight - (value / maxY) * plotHeight,
  };
}

function linePath(points: { x: number; y: number }[] | undefined) {
  if (!points?.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function areaPath(
  points: { x: number; y: number }[] | undefined,
  plotBottom: number
) {
  if (!points?.length) return "";
  const last = points.at(-1)!;
  const first = points[0];
  return `${linePath(points)} L ${last.x} ${plotBottom} L ${first.x} ${plotBottom} Z`;
}

function gradientId(key: string) {
  return `sales-overview-gradient-${key.replace(/[^a-zA-Z0-9-]/g, "")}`;
}

function trendLabel(mode: SalesOverviewMode) {
  if (mode === "day") return "เทียบวันก่อน";
  if (mode === "week") return "เทียบสัปดาห์ก่อน";
  return "เทียบเดือนก่อน";
}

export function SalesOverview({ data }: { data: SalesOverviewData }) {
  const [mode, setMode] = useState<SalesOverviewMode>("day");
  const [activeProduct, setActiveProduct] =
    useState<SalesOverviewSelection>("menus");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const view = data.views[mode];
  const availableIds = new Set(view.breakdown.map((product) => product.id));
  const effectiveProduct: SalesOverviewSelection =
    activeProduct === "all" || activeProduct === "menus"
      ? activeProduct
      : availableIds.has(activeProduct)
        ? activeProduct
        : "menus";
  const showTotal = effectiveProduct === "all";
  const showAllMenus = effectiveProduct === "menus";
  const visibleProducts =
    showTotal
      ? []
      : showAllMenus
        ? data.products.filter((product) => availableIds.has(product.id))
        : data.products.filter((product) => product.id === effectiveProduct);

  const bucketCount = view.buckets.length;
  const totalValues = view.buckets.map((bucket) => bucket.totalRolls);
  const baseSeries = visibleProducts.map((product) => {
    const values = view.buckets.map(
      (bucket) =>
        bucket.products.find((value) => value.productId === product.id)
          ?.quantity ?? 0
    );
    return { product, values };
  });

  const maxValue = Math.max(
    ...totalValues,
    ...baseSeries.flatMap((item) => item.values),
    1
  );
  const maxY = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const plotBottom = HEIGHT - MARGIN.bottom;
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const columnWidth = bucketCount > 0 ? plotWidth / bucketCount : plotWidth;
  const yTicks = Array.from({ length: 5 }, (_, index) => (maxY / 4) * index);

  const clearHover = useCallback(() => setHoverIndex(null), []);

  const totalPoints = totalValues.map((value, index) =>
    pointAt(index, value, bucketCount, maxY)
  );
  const series = baseSeries.map(({ product, values }) => ({
    product,
    values,
    points: values.map((value, index) =>
      pointAt(index, value, bucketCount, maxY)
    ),
  }));

  const hoveredBucket =
    hoverIndex === null ? null : view.buckets[hoverIndex] ?? null;
  const hoveredPoint = useMemo(() => {
    if (hoverIndex === null) return null;

    if (showTotal) {
      return totalPoints[hoverIndex] ?? null;
    }

    const valuesAtIndex = series.map(({ values }) => values[hoverIndex] ?? 0);
    const peakValue = Math.max(...valuesAtIndex, 0);
    return pointAt(hoverIndex, peakValue, bucketCount, maxY);
  }, [hoverIndex, showTotal, totalPoints, series, bucketCount, maxY]);
  const tooltipAbove =
    hoveredPoint === null ? true : hoveredPoint.y > HEIGHT * 0.28;

  const hoveredDisplay = useMemo(() => {
    if (!hoveredBucket) return null;

    if (showTotal || showAllMenus) {
      return {
        rolls: hoveredBucket.totalRolls,
        revenue: hoveredBucket.totalRevenue,
      };
    }

    const productValue = hoveredBucket.products.find(
      (item) => item.productId === effectiveProduct
    );

    return {
      rolls: productValue?.quantity ?? 0,
      revenue: productValue?.revenue ?? 0,
    };
  }, [hoveredBucket, showTotal, showAllMenus, effectiveProduct]);

  const trend = useMemo(() => {
    const withData = view.buckets.filter((bucket) => bucket.totalRolls > 0);
    if (withData.length < 2) return null;

    const current = withData[withData.length - 1];
    const previous = withData[withData.length - 2];
    if (previous.totalRevenue <= 0) return null;

    const pct =
      ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) *
      100;

    return {
      pct,
      label: trendLabel(mode),
      positive: pct >= 0,
    };
  }, [view.buckets, mode]);

  const averageLabel =
    mode === "day"
      ? "เฉลี่ยต่อวัน"
      : mode === "week"
        ? "เฉลี่ยต่อสัปดาห์"
        : "เฉลี่ยต่อเดือน";

  const kpis = [
    {
      label: "ขายรวม",
      value: `${formatNumber(view.totalRolls, 0)} ม้วน`,
      tone: "accent" as const,
    },
    {
      label: "รายได้รวม",
      value: formatCurrency(view.totalRevenue),
      tone: "default" as const,
    },
    {
      label: averageLabel,
      value: `${view.averageRolls.toFixed(1)} ม้วน`,
      tone: "default" as const,
    },
    {
      label: "สูงสุด",
      value: `${view.bestRolls} ม้วน`,
      meta: view.bestLabel,
      tone: "success" as const,
    },
  ];

  return (
    <div className="sales-overview">
      <div className="sales-overview-top">
        <div className="sales-overview-hero">
          <p className="sales-overview-eyebrow">ภาพรวมยอดขาย</p>
          <div className="sales-overview-hero-row">
            <h2 className="sales-overview-hero-value">
              {formatCurrency(view.totalRevenue)}
            </h2>
            {trend && (
              <span
                className={`sales-overview-trend${trend.positive ? " is-up" : " is-down"}`}
              >
                {trend.positive ? "↗" : "↘"} {Math.abs(trend.pct).toFixed(1)}%
                <span>{trend.label}</span>
              </span>
            )}
          </div>
          <p className="sales-overview-hero-meta">
            {view.rangeLabel} · {formatNumber(view.totalRolls, 0)} ม้วน
          </p>
        </div>

        <div className="sales-overview-period" aria-label="ช่วงเวลาของกราฟ">
          {MODES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`sales-overview-period-button${mode === item ? " sales-overview-period-button--active" : ""}`}
            >
              {data.views[item].label}
            </button>
          ))}
        </div>
      </div>

      <div className="sales-overview-body">
        <div className="sales-overview-chart-shell">
          <div className="sales-overview-filters">
            <button
              type="button"
              onClick={() =>
                setActiveProduct(effectiveProduct === "all" ? "menus" : "all")
              }
              className={`sales-overview-filter${showTotal ? " sales-overview-filter--active" : ""}`}
            >
              <span
                className="sales-overview-filter-dot is-total"
                style={{ background: SALES_OVERVIEW_TOTAL_COLOR }}
                aria-hidden
              />
              รวมทุกเมนู
            </button>
            {view.breakdown.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() =>
                  setActiveProduct(
                    effectiveProduct === product.id ? "menus" : product.id
                  )
                }
                className={`sales-overview-filter${effectiveProduct === product.id ? " sales-overview-filter--active" : ""}`}
              >
                <span
                  className="sales-overview-filter-dot"
                  style={{ background: product.color }}
                  aria-hidden
                />
                {product.name}
              </button>
            ))}
          </div>

          <div className="sales-overview-chart-scroll">
            <div className="sales-overview-chart-inner">
              <div className="sales-overview-chart-frame">
                <svg
                  className="sales-overview-chart"
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  role="img"
                  aria-label={`กราฟยอดขาย${view.label} ${view.rangeLabel}`}
                  onMouseLeave={clearHover}
                >
                  <defs>
                    <linearGradient
                      id={gradientId("total")}
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={SALES_OVERVIEW_TOTAL_COLOR}
                        stopOpacity="0.28"
                      />
                      <stop
                        offset="55%"
                        stopColor={SALES_OVERVIEW_TOTAL_COLOR}
                        stopOpacity="0.08"
                      />
                      <stop
                        offset="100%"
                        stopColor={SALES_OVERVIEW_TOTAL_COLOR}
                        stopOpacity="0"
                      />
                    </linearGradient>
                    {series.map(({ product }) => (
                      <linearGradient
                        key={product.id}
                        id={gradientId(product.id)}
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={product.color} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={product.color} stopOpacity="0" />
                      </linearGradient>
                    ))}
                  </defs>

                  {yTicks.map((tick) => {
                    const point = pointAt(0, tick, bucketCount, maxY);
                    return (
                      <g key={tick}>
                        <line
                          x1={MARGIN.left}
                          x2={WIDTH - MARGIN.right}
                          y1={point.y}
                          y2={point.y}
                          className="sales-overview-grid-line"
                        />
                        <text
                          x={WIDTH - MARGIN.right + 10}
                          y={point.y + 4}
                          textAnchor="start"
                          className="sales-overview-y-label"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  {view.buckets.map((bucket, index) => {
                    if (!bucket.selected) return null;
                    const point = pointAt(index, 0, bucketCount, maxY);
                    return (
                      <line
                        key={bucket.key}
                        x1={point.x}
                        x2={point.x}
                        y1={MARGIN.top}
                        y2={plotBottom}
                        className="sales-overview-selected-line"
                      />
                    );
                  })}

                  {showTotal && (
                    <g className="sales-overview-total-series">
                      <path
                        d={areaPath(totalPoints, plotBottom)}
                        fill={`url(#${gradientId("total")})`}
                      />
                      <path
                        d={linePath(totalPoints)}
                        fill="none"
                        stroke={SALES_OVERVIEW_TOTAL_COLOR}
                        className="sales-overview-series sales-overview-series--primary"
                      />
                    </g>
                  )}

                  {series.map(({ product, points }) => (
                    <g key={product.id}>
                      <path
                        d={areaPath(points, plotBottom)}
                        fill={`url(#${gradientId(product.id)})`}
                      />
                      <path
                        d={linePath(points)}
                        fill="none"
                        stroke={product.color}
                        className="sales-overview-series sales-overview-series--primary"
                      />
                    </g>
                  ))}

                  {view.buckets.map((bucket, index) => {
                    const point = pointAt(index, 0, bucketCount, maxY);
                    const zoneX = point.x - columnWidth / 2;
                    return (
                      <rect
                        key={`hover-${bucket.key}`}
                        x={Math.max(MARGIN.left, zoneX)}
                        y={MARGIN.top}
                        width={columnWidth}
                        height={plotBottom - MARGIN.top}
                        fill="transparent"
                        className="sales-overview-hover-zone"
                        onMouseEnter={() => setHoverIndex(index)}
                        onFocus={() => setHoverIndex(index)}
                        onBlur={clearHover}
                        tabIndex={0}
                        aria-label={`${bucket.fullLabel} · ${formatNumber(bucket.totalRolls, 0)} ม้วน · ${formatCurrency(bucket.totalRevenue)}`}
                      />
                    );
                  })}
                </svg>

                {hoveredBucket && hoveredPoint && hoveredDisplay && (
                  <div
                    className={`sales-overview-tooltip${tooltipAbove ? " sales-overview-tooltip--above" : " sales-overview-tooltip--below"}`}
                    style={{
                      left: `${(hoveredPoint.x / WIDTH) * 100}%`,
                      top: `${(hoveredPoint.y / HEIGHT) * 100}%`,
                    }}
                  >
                    <span className="sales-overview-tooltip-date">
                      {hoveredBucket.fullLabel}
                    </span>
                    <strong className="sales-overview-tooltip-value">
                      {hoveredDisplay.rolls} ม้วน
                    </strong>
                    <span className="sales-overview-tooltip-revenue">
                      {formatCurrency(hoveredDisplay.revenue)}
                    </span>
                  </div>
                )}
              </div>

              <div
                className="sales-overview-axis"
                style={{
                  paddingLeft: `${(MARGIN.left / WIDTH) * 100}%`,
                  paddingRight: `${(MARGIN.right / WIDTH) * 100}%`,
                }}
              >
                <div className="sales-overview-axis-track">
                  {view.buckets.map((bucket, index) => {
                    const axisLeft =
                      bucketCount <= 1 ? 0 : (index / (bucketCount - 1)) * 100;
                    const isToday =
                      mode === "day" && bucket.startDate === data.today;
                    const dayNumber = Number(bucket.label);
                    const showDayLabel =
                      mode !== "day" ||
                      dayNumber % 2 === 1 ||
                      isToday ||
                      bucket.selected;
                    const className = [
                      "sales-overview-axis-item",
                      bucket.selected && "sales-overview-axis-item--selected",
                      isToday && "sales-overview-axis-item--today",
                      mode === "week" && "sales-overview-axis-item--week",
                      !showDayLabel && "sales-overview-axis-item--sparse",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const href = `/sales?date=${bucket.startDate}`;

                    return (
                      <Link
                        key={bucket.key}
                        href={href}
                        scroll={false}
                        className={className}
                        title={bucket.fullLabel}
                        style={{ left: `${axisLeft}%` }}
                        onMouseEnter={() => setHoverIndex(index)}
                        onMouseLeave={clearHover}
                      >
                        {bucket.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="sales-overview-kpi-panel" aria-label="สรุปช่วงที่เลือก">
          <div className="sales-overview-kpi-grid">
            {kpis.map((item) => (
              <div
                key={item.label}
                className={`sales-overview-kpi sales-overview-kpi--${item.tone}`}
              >
                <span className="sales-overview-kpi-label">{item.label}</span>
                <strong className="sales-overview-kpi-value">{item.value}</strong>
                {item.meta ? (
                  <small className="sales-overview-kpi-meta">{item.meta}</small>
                ) : (
                  <span className="sales-overview-kpi-spacer" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {view.breakdown.length > 0 && (
        <div className="sales-overview-breakdown">
          <div className="sales-overview-breakdown-head">
            <h3>แยกตามเมนู</h3>
          </div>
          <div className="sales-overview-menu-list">
            {view.breakdown.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() =>
                  setActiveProduct(
                    effectiveProduct === product.id ? "menus" : product.id
                  )
                }
                className={`sales-overview-menu${effectiveProduct === product.id ? " sales-overview-menu--active" : ""}`}
              >
                <span
                  className="sales-overview-menu-dot"
                  style={{ background: product.color }}
                  aria-hidden
                />
                <div className="sales-overview-menu-copy">
                  <strong>{product.name}</strong>
                  <span>
                    {formatNumber(product.quantity, 0)} ม้วน · {formatCurrency(product.revenue)}
                  </span>
                </div>
                <em>{product.share.toFixed(0)}%</em>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
