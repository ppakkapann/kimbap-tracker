"use client";

import { useMemo, useState } from "react";
import { IngredientsInventoryView } from "@/components/ingredients/IngredientsInventoryView";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import type {
  IngredientStockDetail,
} from "@/lib/stock-analysis";
import {
  getInventoryStockStatus,
  inventoryBarPercent,
  type InventoryStockStatus,
} from "@/lib/stock-analysis";
import {
  getIngredientUnitLabel,
  type Ingredient,
  type Product,
  type Purchase,
  type RecipeItem,
  type StockMovement,
} from "@/lib/types";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";

type InventoryFilter = "all" | "low" | "out";

const STATUS_ORDER: Record<InventoryStockStatus, number> = {
  out: 0,
  low: 1,
  ok: 2,
};

function sortByInventoryStatus(a: IngredientStockDetail, b: IngredientStockDetail) {
  const sa = getInventoryStockStatus(a.ingredient);
  const sb = getInventoryStockStatus(b.ingredient);
  if (STATUS_ORDER[sa] !== STATUS_ORDER[sb]) {
    return STATUS_ORDER[sa] - STATUS_ORDER[sb];
  }
  return a.ingredient.name.localeCompare(b.ingredient.name, "th");
}

const STATUS_LABEL: Record<InventoryStockStatus, string> = {
  ok: "ปกติ",
  low: "ใกล้หมด",
  out: "หมด",
};

const STATUS_BADGE: Record<InventoryStockStatus, string> = {
  ok: "app-badge-success",
  low: "app-badge-warning",
  out: "app-badge-danger",
};

function StatusBadge({ status }: { status: InventoryStockStatus }) {
  return (
    <span className={`app-badge ${STATUS_BADGE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function AlertCell({ ingredient }: { ingredient: IngredientStockDetail["ingredient"] }) {
  const unit = getIngredientUnitLabel(ingredient);
  if (ingredient.low_stock_alert <= 0) {
    return <span className="cell-muted text-sm">—</span>;
  }
  return (
    <span className="cell-muted text-sm tabular-nums">
      &lt; {formatNumber(ingredient.low_stock_alert, 0)} {unit}
    </span>
  );
}

function StockBar({
  ingredient,
  status,
}: {
  ingredient: IngredientStockDetail["ingredient"];
  status: InventoryStockStatus;
}) {
  const pct = inventoryBarPercent(ingredient);
  const barColor =
    status === "out"
      ? "var(--danger)"
      : status === "low"
        ? "var(--warning)"
        : "var(--success)";

  return (
    <div className="app-progress-track stock-inventory-bar">
      <div
        className="app-progress-fill"
        style={{ width: `${pct}%`, background: barColor }}
      />
    </div>
  );
}

function InventoryRow({
  detail,
  onPurchase,
}: {
  detail: IngredientStockDetail;
  onPurchase?: () => void;
}) {
  const { ingredient } = detail;
  const unit = getIngredientUnitLabel(ingredient);
  const status = getInventoryStockStatus(ingredient);

  return (
    <>
      <div className="stock-inventory-cell stock-inventory-cell--name">
        <p className="truncate font-medium">{ingredient.name}</p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {unit}
        </p>
      </div>
      <div className="stock-inventory-cell stock-inventory-cell--qty">
        <span
          className="text-base font-semibold tabular-nums"
          style={{
            color:
              status === "out"
                ? "var(--danger)"
                : status === "low"
                  ? "var(--warning)"
                  : "var(--text-primary)",
          }}
        >
          <StockQuantityDisplay ingredient={ingredient} quantity={ingredient.current_stock} />
        </span>
      </div>
      <div className="stock-inventory-cell stock-inventory-cell--alert">
        <AlertCell ingredient={ingredient} />
      </div>
      <div className="stock-inventory-cell stock-inventory-cell--status">
        <StatusBadge status={status} />
      </div>
      <div className="stock-inventory-cell stock-inventory-cell--bar">
        <StockBar ingredient={ingredient} status={status} />
      </div>
      <div className="stock-inventory-cell stock-inventory-cell--action">
        {onPurchase && (status === "low" || status === "out") && (
          <button type="button" onClick={onPurchase} className="app-btn app-btn-secondary app-btn-sm">
            + ซื้อเข้า
          </button>
        )}
      </div>
    </>
  );
}

function InventoryMobileCard({
  detail,
  onPurchase,
}: {
  detail: IngredientStockDetail;
  onPurchase?: () => void;
}) {
  const { ingredient } = detail;
  const unit = getIngredientUnitLabel(ingredient);
  const status = getInventoryStockStatus(ingredient);

  return (
    <div className="stock-inventory-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{ingredient.name}</p>
          {ingredient.low_stock_alert > 0 && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              แจ้งเตือน &lt; {formatNumber(ingredient.low_stock_alert, 0)} {unit}
            </p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <p
        className="mt-3 text-2xl font-semibold tabular-nums leading-none"
        style={{
          color:
            status === "out"
              ? "var(--danger)"
              : status === "low"
                ? "var(--warning)"
                : "var(--text-primary)",
        }}
      >
        {formatNumber(ingredient.current_stock, 0)}
        <span className="ml-1.5 text-sm font-normal" style={{ color: "var(--text-muted)" }}>
          {unit}
        </span>
      </p>

      <div className="mt-3">
        <StockBar ingredient={ingredient} status={status} />
      </div>

      {onPurchase && (status === "low" || status === "out") && (
        <button
          type="button"
          onClick={onPurchase}
          className="app-btn app-btn-secondary app-btn-sm mt-3 w-full"
        >
          + ซื้อเข้า
        </button>
      )}
    </div>
  );
}

export function StockInventoryPanel({
  details,
  onPurchaseTab,
}: {
  details: IngredientStockDetail[];
  onPurchaseTab?: () => void;
}) {
  const [filter, setFilter] = useState<InventoryFilter>("all");

  const sortedDetails = useMemo(
    () => [...details].sort(sortByInventoryStatus),
    [details]
  );

  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const detail of details) {
      const status = getInventoryStockStatus(detail.ingredient);
      if (status === "out") out++;
      else if (status === "low") low++;
    }
    return { all: details.length, low, out };
  }, [details]);

  const filtered = useMemo(() => {
    const base =
      filter === "all"
        ? sortedDetails
        : sortedDetails.filter((detail) => {
            const status = getInventoryStockStatus(detail.ingredient);
            return filter === "low" ? status === "low" : status === "out";
          });
    return base;
  }, [sortedDetails, filter]);

  const filters: { id: InventoryFilter; label: string; count: number }[] = [
    { id: "all", label: "ทั้งหมด", count: counts.all },
    { id: "low", label: "ใกล้หมด", count: counts.low },
    { id: "out", label: "หมด", count: counts.out },
  ];

  if (details.length === 0) {
    return (
      <div className="app-empty">
        <p>ยังไม่มีวัตถุดิบ</p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          เพิ่มวัตถุดิบจากแท็บ &quot;วัตถุดิบ&quot; หรือ &quot;เติมสต็อก&quot;
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="stock-inventory-toolbar">
        <div className="stock-inventory-filters">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`stock-inventory-filter ${filter === item.id ? "stock-inventory-filter--active" : ""}`}
          >
            {item.label}
            <span className="stock-inventory-filter-count">{item.count}</span>
          </button>
        ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          ไม่มีรายการในหมวดนี้
        </p>
      ) : (
        <>
          <div className="stock-inventory-table hidden sm:block">
            <div className="stock-inventory-head">
              <span className="stock-inventory-cell stock-inventory-cell--name">วัตถุดิบ</span>
              <span className="stock-inventory-cell stock-inventory-cell--qty">คงเหลือ</span>
              <span className="stock-inventory-cell stock-inventory-cell--alert">
                แจ้งเตือน
              </span>
              <span className="stock-inventory-cell stock-inventory-cell--status">สถานะ</span>
              <span className="stock-inventory-cell stock-inventory-cell--bar">
                ระดับ
              </span>
              <span className="stock-inventory-cell stock-inventory-cell--action">
                จัดการ
              </span>
            </div>
            {filtered.map((detail) => (
              <div key={detail.ingredient.id} className="stock-inventory-row">
                <InventoryRow detail={detail} onPurchase={onPurchaseTab} />
              </div>
            ))}
          </div>

          <div className="space-y-3 p-4 sm:hidden">
            {filtered.map((detail) => (
              <InventoryMobileCard
                key={detail.ingredient.id}
                detail={detail}
                onPurchase={onPurchaseTab}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DailyStockFlow({
  movements,
  today,
}: {
  movements: StockMovement[];
  today: string;
}) {
  const todayMovements = movements.filter(
    (movement) => movement.created_at.slice(0, 10) === today
  );
  const valueFor = (type: StockMovement["type"]) =>
    todayMovements
      .filter((movement) => movement.type === type)
      .reduce(
        (sum, movement) =>
          sum + Math.abs(movement.quantity) * (movement.unit_cost ?? 0),
        0
      );

  const purchaseValue = valueFor("purchase");
  const saleUsageValue = valueFor("usage");
  const wasteValue = valueFor("waste");
  const countDifferenceValue = valueFor("adjustment");

  return (
    <div className="stock-flow-card">
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          การเคลื่อนไหววันนี้
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          มูลค่าตามต้นทุนเฉลี่ย
        </p>
      </div>
      <div className="stock-flow-metrics">
        <div>
          <span>ซื้อเข้า</span>
          <strong style={{ color: "var(--success)" }}>
            +{formatCurrency(purchaseValue)}
          </strong>
        </div>
        <div>
          <span>ใช้จากขาย</span>
          <strong>{formatCurrency(saleUsageValue)}</strong>
        </div>
        <div>
          <span>สูญเสีย</span>
          <strong style={{ color: wasteValue > 0 ? "var(--danger)" : undefined }}>
            {formatCurrency(wasteValue)}
          </strong>
        </div>
        <div>
          <span>ส่วนต่างตรวจนับ</span>
          <strong>{formatCurrency(countDifferenceValue)}</strong>
        </div>
      </div>
    </div>
  );
}

export function StockOverviewTab({
  movements,
  today,
  ingredients,
  products,
  purchases,
  recipeItems,
  initialSearch,
}: {
  movements: StockMovement[];
  today: string;
  ingredients: Ingredient[];
  products: Product[];
  purchases: Purchase[];
  recipeItems: RecipeItem[];
  initialSearch?: string;
}) {
  return (
    <div className="space-y-6">
      <DailyStockFlow movements={movements} today={today} />

      <IngredientsInventoryView
        embedded
        ingredients={ingredients}
        products={products}
        purchases={purchases}
        recipeItems={recipeItems}
        initialSearch={initialSearch}
      />
    </div>
  );
}
