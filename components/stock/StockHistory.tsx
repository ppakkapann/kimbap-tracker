"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Activity, ShoppingBag, Trash2 } from "lucide-react";
import { deletePurchase } from "@/lib/actions";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { filterByPeriod } from "@/lib/history-groups";
import { purchaseHasYield } from "@/lib/purchase-yield";
import type { HistoryPeriod } from "@/lib/history-groups";
import type { Ingredient, Purchase, StockMovement } from "@/lib/types";
import {
  getIngredientBaseUnit,
  getIngredientUnitLabel,
  type StockMovementType,
} from "@/lib/types";
import { formatQuantityWithHintText } from "@/lib/unit-conversion";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";
import { PurchaseEditModal } from "@/components/stock/PurchaseEditModal";
import {
  HistoryPeriodToggle,
  HistoryTableMonthRow,
  HistoryTableShell,
} from "@/components/stock/HistoryPanelParts";

const movementLabels: Record<StockMovementType, string> = {
  purchase: "ซื้อเข้า",
  usage: "ใช้จากขาย",
  waste: "ตัดออก",
  adjustment: "ตรวจนับ",
};

const movementBadge: Record<StockMovementType, string> = {
  purchase: "app-badge-success",
  usage: "app-badge-warning",
  waste: "app-badge-danger",
  adjustment: "app-badge-default",
};

const typeFilters: { id: StockMovementType | "all"; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "purchase", label: "ซื้อเข้า" },
  { id: "usage", label: "จากขาย" },
  { id: "waste", label: "ตัดออก" },
  { id: "adjustment", label: "ตรวจนับ" },
];

function formatHistoryDate(value: string) {
  return format(new Date(value), "d MMM", { locale: th });
}

function insertMonthMarkers<T>(
  items: T[],
  getMonthKey: (item: T) => string,
  getMeta: (monthKey: string) => string
) {
  const result: Array<
    { kind: "month"; monthKey: string; meta: string } | { kind: "item"; item: T }
  > = [];
  let lastMonth = "";

  for (const item of items) {
    const monthKey = getMonthKey(item);
    if (monthKey !== lastMonth) {
      lastMonth = monthKey;
      result.push({ kind: "month", monthKey, meta: getMeta(monthKey) });
    }
    result.push({ kind: "item", item });
  }

  return result;
}

const movementColumns = (
  <>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--date">
      วันที่
    </span>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--type">
      ประเภท
    </span>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--name">
      วัตถุดิบ
    </span>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--detail">
      รายละเอียด
    </span>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--qty">
      จำนวน
    </span>
  </>
);

const purchaseColumns = (
  <>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--date">
      วันที่
    </span>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--name">
      วัตถุดิบ
    </span>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--qty">
      จำนวน
    </span>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--price">
      ราคา / หน่วย
    </span>
    <span className="ingredient-grid-cell history-grid-cell history-grid-cell--total">
      ยอดซื้อ
    </span>
    <span
      className="ingredient-grid-cell history-grid-cell history-grid-cell--action"
      aria-label="จัดการ"
    />
  </>
);

export function StockMovementHistory({
  movements,
  purchases,
}: {
  movements: StockMovement[];
  purchases: Purchase[];
}) {
  const [typeFilter, setTypeFilter] = useState<StockMovementType | "all">("all");
  const [period, setPeriod] = useState<HistoryPeriod>("quarter");
  const purchaseMap = new Map(purchases.map((p) => [p.id, p]));

  const sortedMovements = useMemo(
    () =>
      [...movements].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [movements]
  );

  const periodMovements = useMemo(
    () => filterByPeriod(sortedMovements, (m) => m.created_at, period),
    [sortedMovements, period]
  );

  const filtered = useMemo(
    () =>
      typeFilter === "all"
        ? periodMovements
        : periodMovements.filter((m) => m.type === typeFilter),
    [periodMovements, typeFilter]
  );

  const monthCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const movement of filtered) {
      const monthKey = movement.created_at.slice(0, 7);
      counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
    }
    return counts;
  }, [filtered]);

  const tableRows = useMemo(
    () =>
      insertMonthMarkers(
        filtered,
        (movement) => movement.created_at.slice(0, 7),
        (monthKey) => `${monthCounts.get(monthKey) ?? 0} รายการ`
      ),
    [filtered, monthCounts]
  );

  return (
    <div className="history-panel-body">
      <div className="history-panel-controls-slot history-panel-controls-slot--movement">
        <div className="history-type-filters">
          {typeFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTypeFilter(item.id)}
              className={`stock-history-filter ${
                typeFilter === item.id ? "stock-history-filter--active" : ""
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <HistoryTableShell
        variant="movement"
        columns={movementColumns}
        periodToggle={
          <HistoryPeriodToggle value={period} onChange={setPeriod} />
        }
        footer={
          filtered.length > 0 ? (
            <div className="history-table-footer">
              <p className="app-table-footer-label">
                รวม {filtered.length} รายการ
              </p>
            </div>
          ) : undefined
        }
      >
        {filtered.length === 0 ? (
          <div className="history-panel-empty">
            <Activity size={28} strokeWidth={1.5} aria-hidden />
            <p>ไม่มีรายการในช่วงนี้</p>
          </div>
        ) : (
          <div className="ingredient-grid-list history-grid-list history-grid-list--movement">
            {tableRows.map((row) => {
              if (row.kind === "month") {
                return (
                  <HistoryTableMonthRow
                    key={`month-${row.monthKey}`}
                    monthKey={row.monthKey}
                    meta={row.meta}
                  />
                );
              }

              const m = row.item;
              const purchase =
                m.type === "purchase" && m.reference_id
                  ? purchaseMap.get(m.reference_id)
                  : null;
              const detailParts = [
                format(new Date(m.created_at), "HH:mm"),
                m.note,
                purchase ? formatCurrency(purchase.total_price) : null,
              ].filter(Boolean);

              return (
                <div key={m.id} className="ingredient-grid-row history-grid-row">
                  <div className="ingredient-grid-cell history-grid-cell history-grid-cell--date">
                    <span className="cell-numeric cell-muted text-sm tabular-nums">
                      {formatHistoryDate(m.created_at)}
                    </span>
                  </div>
                  <div className="ingredient-grid-cell history-grid-cell history-grid-cell--type">
                    <span className={`app-badge ${movementBadge[m.type]}`}>
                      {movementLabels[m.type]}
                    </span>
                  </div>
                  <div className="ingredient-grid-cell history-grid-cell history-grid-cell--name">
                    <span className="truncate text-sm font-medium">
                      {m.ingredient?.name || "วัตถุดิบ"}
                    </span>
                  </div>
                  <div className="ingredient-grid-cell history-grid-cell history-grid-cell--detail">
                    <span className="cell-muted truncate text-sm">
                      {detailParts.join(" · ")}
                    </span>
                  </div>
                  <div className="ingredient-grid-cell history-grid-cell history-grid-cell--qty">
                    {m.ingredient ? (
                      <span
                        className="cell-numeric text-sm tabular-nums"
                        style={{
                          color:
                            m.quantity >= 0 ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        <StockQuantityDisplay
                          ingredient={m.ingredient}
                          quantity={m.quantity}
                          decimals={1}
                          signed
                        />
                      </span>
                    ) : (
                      <span
                        className="cell-numeric text-sm tabular-nums"
                        style={{
                          color:
                            m.quantity >= 0 ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {m.quantity >= 0 ? "+" : ""}
                        {formatNumber(m.quantity, 1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HistoryTableShell>
    </div>
  );
}

export function PurchaseHistoryTable({
  purchases,
  ingredients,
  today,
}: {
  purchases: Purchase[];
  ingredients: Ingredient[];
  today: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<HistoryPeriod>("quarter");

  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  const periodPurchases = useMemo(() => {
    const now = new Date(`${today}T12:00:00`);
    return filterByPeriod(purchases, (p) => p.purchased_at, period, now).sort(
      (a, b) =>
        new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
    );
  }, [purchases, period, today]);

  const totalSpent = useMemo(
    () => periodPurchases.reduce((sum, p) => sum + p.total_price, 0),
    [periodPurchases]
  );

  const monthStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();
    for (const purchase of periodPurchases) {
      const monthKey = purchase.purchased_at.slice(0, 7);
      const current = stats.get(monthKey) ?? { count: 0, total: 0 };
      stats.set(monthKey, {
        count: current.count + 1,
        total: current.total + purchase.total_price,
      });
    }
    return stats;
  }, [periodPurchases]);

  const currentMonthKey = today.slice(0, 7);
  const thisMonthStats = monthStats.get(currentMonthKey);

  const tableRows = useMemo(
    () =>
      insertMonthMarkers(
        periodPurchases,
        (purchase) => purchase.purchased_at.slice(0, 7),
        (monthKey) => {
          const stats = monthStats.get(monthKey);
          if (!stats) return "0 รายการ";
          return `${stats.count} รายการ · ${formatCurrency(stats.total)}`;
        }
      ),
    [periodPurchases, monthStats]
  );

  async function handleDelete(purchaseId: string) {
    setDeletingId(purchaseId);
    setError("");
    const result = await deletePurchase(purchaseId);
    if (result.error) {
      setError(result.error);
      setDeletingId(null);
      return;
    }
    setPendingId(null);
    setDeletingId(null);
    startTransition(() => router.refresh());
  }

  if (purchases.length === 0) {
    return (
      <div className="history-panel-body">
        <div className="history-panel-empty history-panel-empty--fill">
          <ShoppingBag size={28} strokeWidth={1.5} aria-hidden />
          <p>ยังไม่มีประวัติการซื้อ</p>
          <span>บันทึกจาก + เติมสต็อก</span>
        </div>
      </div>
    );
  }

  return (
    <div className="history-panel-body">
      {editingPurchase && ingredientMap.get(editingPurchase.ingredient_id) && (
        <PurchaseEditModal
          purchase={editingPurchase}
          ingredient={ingredientMap.get(editingPurchase.ingredient_id)!}
          onClose={() => setEditingPurchase(null)}
        />
      )}

      <div className="history-panel-controls-slot history-panel-controls-slot--purchase">
        <div className="purchase-history-summary">
          <div className="purchase-history-stat">
            <span className="purchase-history-stat-label">ช่วงที่เลือก</span>
            <span className="purchase-history-stat-value tabular-nums">
              {periodPurchases.length} รายการ
            </span>
          </div>
          <div className="purchase-history-stat">
            <span className="purchase-history-stat-label">ยอดซื้อ</span>
            <span
              className="purchase-history-stat-value"
              style={{ color: "var(--accent)" }}
            >
              {formatCurrency(totalSpent)}
            </span>
          </div>
          {thisMonthStats && period !== "month" && (
            <div className="purchase-history-stat">
              <span className="purchase-history-stat-label">เดือนนี้</span>
              <span className="purchase-history-stat-value tabular-nums">
                {thisMonthStats.count} · {formatCurrency(thisMonthStats.total)}
              </span>
            </div>
          )}
        </div>

        {error && (
          <p
            className="history-panel-error"
            style={{
              color: "var(--danger)",
              background: "var(--danger-muted)",
              border: "1px solid rgba(239,68,68,.2)",
            }}
          >
            {error}
          </p>
        )}
      </div>

      <HistoryTableShell
        variant="purchase"
        columns={purchaseColumns}
        periodToggle={
          <HistoryPeriodToggle value={period} onChange={setPeriod} />
        }
        footer={
          periodPurchases.length > 0 ? (
            <div className="history-table-footer">
              <p className="app-table-footer-label">
                รวม {periodPurchases.length} รายการ
              </p>
              <p
                className="app-table-footer-value tabular-nums"
                style={{ color: "var(--accent)" }}
              >
                {formatCurrency(totalSpent)}
              </p>
            </div>
          ) : undefined
        }
      >
        {periodPurchases.length === 0 ? (
          <div className="history-panel-empty">
            <ShoppingBag size={28} strokeWidth={1.5} aria-hidden />
            <p>ไม่มีรายการในช่วงนี้</p>
          </div>
        ) : (
          <div className="ingredient-grid-list history-grid-list history-grid-list--purchase">
            {tableRows.map((row) => {
              if (row.kind === "month") {
                return (
                  <HistoryTableMonthRow
                    key={`month-${row.monthKey}`}
                    monthKey={row.monthKey}
                    meta={row.meta}
                  />
                );
              }

              const p = row.item;
              const ing = ingredientMap.get(p.ingredient_id);
              const unit = ing ? getIngredientUnitLabel(ing) : "";
              const isPending = pendingId === p.id;
              const isDeleting = deletingId === p.id;
              const detailParts = [
                p.prep_pending ? "รอเตรียม" : null,
                purchaseHasYield(p) && !p.prep_pending && ing
                  ? `ซื้อ ${formatQuantityWithHintText(p.gross_quantity ?? p.quantity, getIngredientBaseUnit(ing), { customLabel: ing.unit_label, decimals: 0 })} · ใช้ได้ ${formatQuantityWithHintText(p.quantity, getIngredientBaseUnit(ing), { customLabel: ing.unit_label, decimals: 0 })}`
                  : purchaseHasYield(p) && !p.prep_pending
                  ? `ซื้อ ${formatNumber(p.gross_quantity ?? p.quantity, 0)} · ใช้ได้ ${formatNumber(p.quantity, 0)} ${unit}`
                  : null,
                p.note,
              ].filter(Boolean);

              return (
                <Fragment key={p.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`ingredient-grid-row history-grid-row history-grid-row--interactive${isPending ? " history-grid-row--confirming" : ""}`}
                    onClick={() => {
                      if (isPending || isDeleting || !ing) return;
                      setError("");
                      setEditingPurchase(p);
                    }}
                    onKeyDown={(event) => {
                      if (isPending || isDeleting || !ing) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setError("");
                        setEditingPurchase(p);
                      }
                    }}
                  >
                    <div className="ingredient-grid-cell history-grid-cell history-grid-cell--date">
                      <span className="cell-numeric cell-muted text-sm tabular-nums">
                        {formatHistoryDate(p.purchased_at)}
                      </span>
                    </div>
                    <div className="ingredient-grid-cell history-grid-cell history-grid-cell--name">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {ing?.name ?? "วัตถุดิบ"}
                        </p>
                        {detailParts.length > 0 && (
                          <p className="cell-muted mt-0.5 truncate text-xs">
                            {detailParts.join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ingredient-grid-cell history-grid-cell history-grid-cell--qty">
                      {ing ? (
                        <StockQuantityDisplay
                          ingredient={ing}
                          quantity={p.quantity}
                        />
                      ) : (
                        <span className="cell-numeric cell-muted text-sm tabular-nums">
                          {formatNumber(p.quantity, 0)}
                          {unit && (
                            <span className="cell-muted ml-0.5 text-xs">
                              {unit}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="ingredient-grid-cell history-grid-cell history-grid-cell--price">
                      <span className="cell-numeric cell-muted text-sm tabular-nums">
                        {formatCurrency(p.unit_cost)}
                        {unit && (
                          <span className="cell-muted ml-0.5 text-xs">
                            /{unit}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="ingredient-grid-cell history-grid-cell history-grid-cell--total">
                      <span
                        className="cell-numeric text-sm tabular-nums"
                        style={{ color: "var(--accent)" }}
                      >
                        {formatCurrency(p.total_price)}
                      </span>
                    </div>
                    <div className="ingredient-grid-cell history-grid-cell history-grid-cell--action">
                      {!isPending && (
                        <button
                          type="button"
                          aria-label={`ลบการซื้อ ${ing?.name ?? ""}`}
                          disabled={isDeleting}
                          onClick={(event) => {
                            event.stopPropagation();
                            setError("");
                            setPendingId(p.id);
                          }}
                          className="purchase-history-delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isPending && (
                    <div className="history-grid-confirm-row">
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        ลบรายการนี้? สต็อกจะลด{" "}
                        <strong className="tabular-nums">
                          {formatNumber(p.quantity, 0)} {unit}
                        </strong>
                      </p>
                      <div className="history-grid-confirm-actions">
                        <button
                          type="button"
                          className="app-btn app-btn-secondary app-btn-sm"
                          disabled={isDeleting}
                          onClick={() => setPendingId(null)}
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          className="app-btn app-btn-danger app-btn-sm"
                          disabled={isDeleting}
                          onClick={() => handleDelete(p.id)}
                        >
                          {isDeleting ? "กำลังลบ..." : "ลบ"}
                        </button>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
      </HistoryTableShell>
    </div>
  );
}
