"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import {
  getCategoryBadgeStyle,
  getIngredientCategoryLabel,
} from "@/lib/ingredient-categories";
import { getInventoryStockStatus } from "@/lib/stock-analysis";
import type { Ingredient } from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";
import { StockQuantityDisplay } from "@/components/stock/StockQuantityDisplay";
import { YIELD_UNIT } from "@/lib/yield-unit";

export interface IngredientRowData {
  ingredient: Ingredient;
  unitCost: number;
  quantityPerRoll: number;
  costPerRoll: number;
  low: boolean;
  rollsPossible: number | null;
  isBottleneck?: boolean;
}

function yieldTextColor(row: IngredientRowData): string | undefined {
  if (row.isBottleneck || row.low) return "var(--danger)";
  if (row.rollsPossible !== null && row.rollsPossible < 10) return "var(--warning)";
  return "var(--success)";
}

function YieldCell({ row }: { row: IngredientRowData }) {
  const showYield = row.rollsPossible !== null && row.quantityPerRoll > 0;

  return (
    <div className="ingredient-grid-cell ingredient-grid-cell--yield">
      {showYield ? (
        <span
          className="cell-numeric text-sm tabular-nums"
          style={{ color: yieldTextColor(row) }}
        >
          {formatNumber(row.rollsPossible ?? 0, 0)} {YIELD_UNIT}
        </span>
      ) : (
        <span className="cell-muted text-sm">—</span>
      )}
    </div>
  );
}

function LowStockDot({ low }: { low: boolean }) {
  if (!low) return null;
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: "var(--danger)" }}
    />
  );
}

function CategoryBadge({
  ingredient,
  allCategories,
}: {
  ingredient: Ingredient;
  allCategories: string[];
}) {
  const label = getIngredientCategoryLabel(ingredient.category);
  const style = getCategoryBadgeStyle(label, allCategories);
  return (
    <span className="ingredient-category-badge" style={style}>
      {label}
    </span>
  );
}

function DragHandle({
  listeners,
  attributes,
}: {
  listeners?: ReturnType<typeof useSortable>["listeners"];
  attributes?: ReturnType<typeof useSortable>["attributes"];
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      className="ingredient-grip-handle"
      aria-label="กดค้างแล้วลากเพื่อเรียงลำดับ"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} strokeWidth={2.25} />
    </span>
  );
}

function StockCell({ row }: { row: IngredientRowData }) {
  return (
    <div className="ingredient-grid-cell ingredient-grid-cell--stock">
      <span
        className="cell-numeric text-sm leading-snug"
        style={{ color: row.low ? "var(--danger)" : undefined }}
      >
        <StockQuantityDisplay
          ingredient={row.ingredient}
          quantity={row.ingredient.current_stock}
        />
      </span>
    </div>
  );
}

function AlertCell({ row }: { row: IngredientRowData }) {
  const { ingredient } = row;
  const unit = getIngredientUnitLabel(ingredient);
  const status = getInventoryStockStatus(ingredient);

  if (ingredient.low_stock_alert <= 0) {
    return (
      <div className="ingredient-grid-cell ingredient-grid-cell--alert">
        <span className="cell-muted text-sm">—</span>
      </div>
    );
  }

  const label =
    status === "out" ? "หมด" : status === "low" ? "ใกล้หมด" : "ปกติ";
  const badge =
    status === "out"
      ? "app-badge-danger"
      : status === "low"
        ? "app-badge-warning"
        : "app-badge-success";

  return (
    <div className="ingredient-grid-cell ingredient-grid-cell--alert">
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <span className={`app-badge shrink-0 ${badge}`}>{label}</span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: "var(--text-muted)" }}
        >
          &lt; {formatNumber(ingredient.low_stock_alert, 0)} {unit}
        </span>
      </div>
    </div>
  );
}

function MobileAlertText({ row }: { row: IngredientRowData }) {
  const { ingredient } = row;
  if (ingredient.low_stock_alert <= 0) return null;

  const status = getInventoryStockStatus(ingredient);
  const unit = getIngredientUnitLabel(ingredient);
  const color =
    status === "out"
      ? "var(--danger)"
      : status === "low"
        ? "var(--warning)"
        : "var(--text-muted)";

  return (
    <span style={{ color }}>
      แจ้ง &lt; {formatNumber(ingredient.low_stock_alert, 0)} {unit}
    </span>
  );
}

function DesktopRowContent({
  row,
  productId,
  grip,
  allCategories,
}: {
  row: IngredientRowData;
  productId: string;
  grip: ReactNode;
  allCategories: string[];
}) {
  const unit = getIngredientUnitLabel(row.ingredient);

  return (
    <>
      <div className="ingredient-grid-cell ingredient-grid-cell--name">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {grip}
          <LowStockDot low={row.low} />
          <span className="truncate font-medium">{row.ingredient.name}</span>
          <CategoryBadge ingredient={row.ingredient} allCategories={allCategories} />
          <span className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
            · {unit}
          </span>
        </div>
      </div>
      <div className="ingredient-grid-cell ingredient-grid-cell--price">
        <span className="cell-numeric cell-muted text-sm">
          {row.unitCost > 0 ? formatCurrency(row.unitCost) : "—"}
        </span>
      </div>
      <StockCell row={row} />
      <AlertCell row={row} />
      <div className="ingredient-grid-cell ingredient-grid-cell--cost">
        <span className="cell-numeric text-sm">
          {row.costPerRoll > 0 ? (
            <span style={{ color: "var(--success)" }}>
              {formatCurrency(row.costPerRoll)}
            </span>
          ) : (
            <span className="cell-muted">—</span>
          )}
        </span>
      </div>
      <div className="ingredient-grid-cell ingredient-grid-cell--qty">
        <span className="cell-numeric cell-muted text-sm">
          {productId && row.quantityPerRoll > 0
            ? `${formatNumber(row.quantityPerRoll, 0)} ${unit}`
            : "—"}
        </span>
      </div>
      <YieldCell row={row} />
    </>
  );
}

function StaticDesktopRow({
  row,
  productId,
  onEdit,
  allCategories,
}: {
  row: IngredientRowData;
  productId: string;
  onEdit: (id: string) => void;
  allCategories: string[];
}) {
  const id = row.ingredient.id;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onEdit(id);
      }}
      className="ingredient-grid-row"
    >
      <DesktopRowContent
        row={row}
        productId={productId}
        grip={<span className="ingredient-head-grip-spacer" aria-hidden />}
        allCategories={allCategories}
      />
    </div>
  );
}

function SortableDesktopRow({
  row,
  productId,
  onEdit,
  allCategories,
}: {
  row: IngredientRowData;
  productId: string;
  onEdit: (id: string) => void;
  allCategories: string[];
}) {
  const id = row.ingredient.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.28 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => onEdit(id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onEdit(id);
      }}
      className={`ingredient-grid-row ${isDragging ? "ingredient-grid-row--placeholder" : ""}`}
    >
      <DesktopRowContent
        row={row}
        productId={productId}
        grip={<DragHandle listeners={listeners} attributes={attributes} />}
        allCategories={allCategories}
      />
    </div>
  );
}

function MobileYieldText({ row }: { row: IngredientRowData }) {
  if (row.rollsPossible === null || row.quantityPerRoll <= 0) return null;

  return (
    <span
      className="text-xs tabular-nums"
      style={{ color: yieldTextColor(row) }}
    >
      {formatNumber(row.rollsPossible, 0)} {YIELD_UNIT}
    </span>
  );
}

function StaticMobileRow({
  row,
  productId,
  onEdit,
  allCategories,
}: {
  row: IngredientRowData;
  productId: string;
  onEdit: (id: string) => void;
  allCategories: string[];
}) {
  const id = row.ingredient.id;
  const unit = getIngredientUnitLabel(row.ingredient);

  return (
    <div className="ingredient-mobile-row">
      <button type="button" onClick={() => onEdit(id)} className="ingredient-mobile-row-main">
        <span className="ingredient-head-grip-spacer" aria-hidden />
        <div className="ingredient-mobile-main">
          <div className="ingredient-mobile-title-row">
            <LowStockDot low={row.low} />
            <span className="ingredient-mobile-name">{row.ingredient.name}</span>
          </div>
          <div className="ingredient-mobile-tags-row">
            <CategoryBadge ingredient={row.ingredient} allCategories={allCategories} />
            <span className="ingredient-mobile-unit">{unit}</span>
          </div>
          <div className="ingredient-mobile-stats-row">
            <span>
              {row.unitCost > 0 ? formatCurrency(row.unitCost) : "—"}/หน่วย
            </span>
            <MobileAlertText row={row} />
            {row.costPerRoll > 0 && (
              <span style={{ color: "var(--success)" }}>
                {formatCurrency(row.costPerRoll)}/{YIELD_UNIT}
              </span>
            )}
            {productId && row.quantityPerRoll > 0 && (
              <span>
                ใช้ {formatNumber(row.quantityPerRoll, 0)} {unit}
              </span>
            )}
          </div>
        </div>
        <div className="ingredient-mobile-side">
          <span
            className="text-sm font-semibold tabular-nums leading-none"
            style={{ color: row.low ? "var(--danger)" : "var(--text-primary)" }}
          >
            {formatNumber(row.ingredient.current_stock, 0)}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
          <MobileYieldText row={row} />
        </div>
      </button>
    </div>
  );
}

function SortableMobileRow({
  row,
  productId,
  onEdit,
  allCategories,
}: {
  row: IngredientRowData;
  productId: string;
  onEdit: (id: string) => void;
  allCategories: string[];
}) {
  const id = row.ingredient.id;
  const unit = getIngredientUnitLabel(row.ingredient);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.28 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ingredient-mobile-row ${isDragging ? "ingredient-mobile-row--placeholder" : ""}`}
    >
      <button
        type="button"
        onClick={() => onEdit(id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onEdit(id);
        }}
        className="ingredient-mobile-row-main"
      >
        <DragHandle listeners={listeners} attributes={attributes} />
        <div className="ingredient-mobile-main">
          <div className="ingredient-mobile-title-row">
            <LowStockDot low={row.low} />
            <span className="ingredient-mobile-name">{row.ingredient.name}</span>
          </div>
          <div className="ingredient-mobile-tags-row">
            <CategoryBadge ingredient={row.ingredient} allCategories={allCategories} />
            <span className="ingredient-mobile-unit">{unit}</span>
          </div>
          <div className="ingredient-mobile-stats-row">
            <span>
              {row.unitCost > 0 ? formatCurrency(row.unitCost) : "—"}/หน่วย
            </span>
            <MobileAlertText row={row} />
            {row.costPerRoll > 0 && (
              <span style={{ color: "var(--success)" }}>
                {formatCurrency(row.costPerRoll)}/{YIELD_UNIT}
              </span>
            )}
            {productId && row.quantityPerRoll > 0 && (
              <span>
                ใช้ {formatNumber(row.quantityPerRoll, 0)} {unit}
              </span>
            )}
          </div>
        </div>
        <div className="ingredient-mobile-side">
          <span
            className="text-sm font-semibold tabular-nums leading-none"
            style={{ color: row.low ? "var(--danger)" : "var(--text-primary)" }}
          >
            {formatNumber(row.ingredient.current_stock, 0)}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
          <MobileYieldText row={row} />
        </div>
      </button>
    </div>
  );
}

function DragPreview({
  row,
  productId,
  variant,
  allCategories,
}: {
  row: IngredientRowData;
  productId: string;
  variant: "desktop" | "mobile";
  allCategories: string[];
}) {
  if (variant === "desktop") {
    return (
      <div className="ingredient-drag-preview ingredient-grid-row">
        <DesktopRowContent
          row={row}
          productId={productId}
          allCategories={allCategories}
          grip={
            <span className="ingredient-grip-handle ingredient-grip-handle--active">
              <GripVertical size={16} strokeWidth={2.25} />
            </span>
          }
        />
      </div>
    );
  }

  const unit = getIngredientUnitLabel(row.ingredient);
  return (
    <div className="ingredient-drag-preview ingredient-mobile-row">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span className="ingredient-grip-handle ingredient-grip-handle--active">
          <GripVertical size={16} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <LowStockDot low={row.low} />
            <span className="font-medium">{row.ingredient.name}</span>
            <CategoryBadge ingredient={row.ingredient} allCategories={allCategories} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {unit}
            </span>
          </div>
        </div>
      </div>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {formatNumber(row.ingredient.current_stock, 0)}
      </span>
    </div>
  );
}

export function IngredientSortableList({
  rows,
  productId,
  canReorder,
  onReorder,
  onEdit,
  variant,
  footer,
  allCategories,
}: {
  rows: IngredientRowData[];
  productId: string;
  canReorder: boolean;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (id: string) => void;
  variant: "desktop" | "mobile";
  footer?: ReactNode;
  allCategories: string[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const ids = useMemo(() => rows.map((row) => row.ingredient.id), [rows]);
  const activeRow = activeId
    ? rows.find((row) => row.ingredient.id === activeId)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 280, tolerance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 320, tolerance: 10 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  if (!canReorder) {
    const StaticRow = variant === "desktop" ? StaticDesktopRow : StaticMobileRow;
    return (
      <>
        {rows.map((row) => (
          <StaticRow
            key={row.ingredient.id}
            row={row}
            productId={productId}
            onEdit={onEdit}
            allCategories={allCategories}
          />
        ))}
        {footer}
      </>
    );
  }

  const SortableRow =
    variant === "desktop" ? SortableDesktopRow : SortableMobileRow;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {rows.map((row) => (
          <SortableRow
            key={row.ingredient.id}
            row={row}
            productId={productId}
            onEdit={onEdit}
            allCategories={allCategories}
          />
        ))}
      </SortableContext>
      {footer}
      <DragOverlay
        adjustScale={false}
        dropAnimation={{
          duration: 240,
          easing: "cubic-bezier(0.18, 0.67, 0.16, 0.99)",
        }}
      >
        {activeRow ? (
          <DragPreview
            row={activeRow}
            productId={productId}
            variant={variant}
            allCategories={allCategories}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
