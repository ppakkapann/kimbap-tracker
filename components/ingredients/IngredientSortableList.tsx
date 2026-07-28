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
import {
  IngredientMobileCard,
} from "@/components/ingredients/IngredientMobileCard";

export interface IngredientRowData {
  ingredient: Ingredient;
  unitCost: number;
  low: boolean;
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

function DesktopRowContent({
  row,
  grip,
  allCategories,
}: {
  row: IngredientRowData;
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
    </>
  );
}

function StaticDesktopRow({
  row,
  onEdit,
  allCategories,
}: {
  row: IngredientRowData;
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
        grip={<span className="ingredient-head-grip-spacer" aria-hidden />}
        allCategories={allCategories}
      />
    </div>
  );
}

function SortableDesktopRow({
  row,
  onEdit,
  allCategories,
}: {
  row: IngredientRowData;
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
        grip={<DragHandle listeners={listeners} attributes={attributes} />}
        allCategories={allCategories}
      />
    </div>
  );
}

function StaticMobileRow({
  row,
  onEdit,
  allCategories,
}: {
  row: IngredientRowData;
  onEdit: (id: string) => void;
  allCategories: string[];
}) {
  return (
    <IngredientMobileCard
      row={row}
      onEdit={onEdit}
      allCategories={allCategories}
      grip={<span className="ingredient-head-grip-spacer" aria-hidden />}
    />
  );
}

function SortableMobileRow({
  row,
  onEdit,
  allCategories,
}: {
  row: IngredientRowData;
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
      className={isDragging ? "ingredient-mobile-card--dragging" : undefined}
    >
      <IngredientMobileCard
        row={row}
        onEdit={onEdit}
        allCategories={allCategories}
        grip={<DragHandle listeners={listeners} attributes={attributes} />}
      />
    </div>
  );
}

function DragPreview({
  row,
  variant,
  allCategories,
}: {
  row: IngredientRowData;
  variant: "desktop" | "mobile";
  allCategories: string[];
}) {
  if (variant === "desktop") {
    return (
      <div className="ingredient-drag-preview ingredient-grid-row">
        <DesktopRowContent
          row={row}
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

  return (
    <div className="ingredient-drag-preview ingredient-mobile-card">
      <IngredientMobileCard
        row={row}
        onEdit={() => {}}
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

export function IngredientSortableList({
  rows,
  canReorder,
  onReorder,
  onEdit,
  variant,
  footer,
  allCategories,
}: {
  rows: IngredientRowData[];
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
            variant={variant}
            allCategories={allCategories}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
