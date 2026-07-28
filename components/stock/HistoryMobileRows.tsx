"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ChevronRight, Trash2 } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import type { Ingredient, Purchase, StockMovement } from "@/lib/types";
import type { StockMovementType } from "@/lib/types";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";

export function HistoryMobileDateChip({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <div className="history-mobile-date" aria-hidden>
      <span className="history-mobile-date-day">{format(date, "d")}</span>
      <span className="history-mobile-date-month">
        {format(date, "MMM", { locale: th })}
      </span>
    </div>
  );
}

export function HistoryMobileMonthRow({
  monthKey,
  meta,
}: {
  monthKey: string;
  meta: string;
}) {
  const monthDate = new Date(`${monthKey}-01`);
  const monthLabel = format(monthDate, "MMMM yyyy", { locale: th });

  return (
    <div className="history-mobile-month sm:hidden">
      <span className="history-mobile-month-label">{monthLabel}</span>
      <span className="history-mobile-month-meta tabular-nums">{meta}</span>
    </div>
  );
}

export function HistoryMobileMovementRow({
  movement,
  typeLabel,
  badgeClass,
  detail,
}: {
  movement: StockMovement;
  typeLabel: string;
  badgeClass: string;
  detail: string;
}) {
  const qtyColor =
    movement.quantity >= 0 ? "var(--success)" : "var(--danger)";

  return (
    <article className="history-mobile-card history-mobile-card--movement sm:hidden">
      <HistoryMobileDateChip iso={movement.created_at} />
      <div className="history-mobile-card-body">
        <div className="history-mobile-card-top">
          <p className="history-mobile-card-title">
            {movement.ingredient?.name || "วัตถุดิบ"}
          </p>
          <div className="history-mobile-card-amount" style={{ color: qtyColor }}>
            {movement.ingredient ? (
              <StockQuantityDisplay
                ingredient={movement.ingredient}
                quantity={movement.quantity}
                decimals={1}
                signed
              />
            ) : (
              <>
                {movement.quantity >= 0 ? "+" : ""}
                {formatNumber(movement.quantity, 1)}
              </>
            )}
          </div>
        </div>
        <div className="history-mobile-card-meta">
          <span className={`app-badge ${badgeClass}`}>{typeLabel}</span>
          {detail ? (
            <span className="history-mobile-card-detail">{detail}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function HistoryMobilePurchaseRow({
  purchase,
  ingredient,
  unit,
  detail,
  isPending,
  isDeleting,
  onOpen,
  onDelete,
}: {
  purchase: Purchase;
  ingredient: Ingredient | undefined;
  unit: string;
  detail: string;
  isPending: boolean;
  isDeleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={`history-mobile-card history-mobile-card--purchase sm:hidden${
        isPending ? " history-mobile-card--confirming" : ""
      }`}
    >
      <button
        type="button"
        className="history-mobile-card-hit"
        disabled={isPending || isDeleting || !ingredient}
        onClick={onOpen}
      >
        <HistoryMobileDateChip iso={purchase.purchased_at} />
        <div className="history-mobile-card-body">
          <div className="history-mobile-card-top">
            <p className="history-mobile-card-title">
              {ingredient?.name ?? "วัตถุดิบ"}
            </p>
            <div
              className="history-mobile-card-amount"
              style={{ color: "var(--accent)" }}
            >
              {formatCurrency(purchase.total_price)}
            </div>
          </div>
          <div className="history-mobile-card-meta history-mobile-card-meta--purchase">
            <span className="history-mobile-card-qty">
              {ingredient ? (
                <StockQuantityDisplay
                  ingredient={ingredient}
                  quantity={purchase.quantity}
                />
              ) : (
                <>
                  {formatNumber(purchase.quantity, 0)}
                  {unit ? ` ${unit}` : ""}
                </>
              )}
            </span>
            <span className="history-mobile-card-dot" aria-hidden>
              ·
            </span>
            <span className="history-mobile-card-price tabular-nums">
              {formatCurrency(purchase.unit_cost)}
              {unit ? `/${unit}` : ""}
            </span>
          </div>
          {detail ? (
            <p className="history-mobile-card-detail">{detail}</p>
          ) : null}
        </div>
        <ChevronRight
          size={16}
          strokeWidth={1.75}
          className="history-mobile-card-chevron"
          aria-hidden
        />
      </button>
      {!isPending ? (
        <button
          type="button"
          className="history-mobile-card-delete"
          aria-label={`ลบการซื้อ ${ingredient?.name ?? ""}`}
          disabled={isDeleting}
          onClick={onDelete}
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      ) : null}
    </article>
  );
}

export function HistoryMobilePurchaseConfirm({
  quantity,
  unit,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  quantity: number;
  unit: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="history-mobile-confirm sm:hidden">
      <p>
        ลบรายการนี้? สต็อกจะลด{" "}
        <strong className="tabular-nums">
          {formatNumber(quantity, 0)} {unit}
        </strong>
      </p>
      <div className="history-mobile-confirm-actions">
        <button
          type="button"
          className="app-btn app-btn-secondary app-btn-sm"
          disabled={isDeleting}
          onClick={onCancel}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          className="app-btn app-btn-danger app-btn-sm"
          disabled={isDeleting}
          onClick={onConfirm}
        >
          {isDeleting ? "กำลังลบ..." : "ลบ"}
        </button>
      </div>
    </div>
  );
}