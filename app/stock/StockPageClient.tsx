"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { StockOverviewTab } from "@/components/stock/StockOverview";
import {
  PurchaseHistoryTable,
  StockMovementHistory,
} from "@/components/stock/StockHistory";
import { filterActualPurchases } from "@/lib/purchases";
import type {
  Ingredient,
  Product,
  Purchase,
  RecipeItem,
  StockMovement,
} from "@/lib/types";

const TABS = [
  { id: "overview", label: "ภาพรวม" },
  { id: "history", label: "ประวัติ" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function parseTab(value: string | null): Tab {
  if (value === "ingredients") return "overview";
  if (value && TABS.some((t) => t.id === value)) return value as Tab;
  return "overview";
}

export function StockPageClient({
  overviewSummary,
  ingredients,
  products,
  recipeItems,
  movements,
  purchases,
  initialTab,
  initialSearch,
  today,
}: {
  overviewSummary: ReactNode;
  ingredients: Ingredient[];
  products: Product[];
  recipeItems: RecipeItem[];
  movements: StockMovement[];
  purchases: Purchase[];
  initialTab?: string;
  initialSearch?: string;
  today: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab") ?? initialTab ?? null);
  const actualPurchases = filterActualPurchases(purchases, movements);

  const setTab = useCallback(
    (id: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", id);
      }
      const qs = params.toString();
      router.push(qs ? `/stock?${qs}` : "/stock", { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-6">
      <div className="app-tabs overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`app-tab shrink-0 ${tab === t.id ? "app-tab-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {overviewSummary}
          <StockOverviewTab
            movements={movements}
            today={today}
            ingredients={ingredients}
            products={products}
            purchases={purchases}
            recipeItems={recipeItems}
            initialSearch={initialSearch}
          />
        </div>
      )}

      {tab === "history" && (
        <div className="history-grid stock-history-grid">
          <div className="app-card history-panel-card">
            <h2 className="app-section-title mb-1">ประวัติการเคลื่อนไหว</h2>
            <p className="history-panel-subtitle">
              ซื้อ · ขาย · ตัดออก · ตรวจนับ — จัดตามเดือน
            </p>
            <StockMovementHistory movements={movements} purchases={purchases} />
          </div>
          <div className="app-card history-panel-card">
            <h2 className="app-section-title mb-1">ประวัติการซื้อ</h2>
            <p className="history-panel-subtitle">
              เฉพาะ + เติมสต็อก — จิ้มรายการเพื่อแก้ไข
            </p>
            <PurchaseHistoryTable
              purchases={actualPurchases}
              ingredients={ingredients}
              today={today}
            />
          </div>
        </div>
      )}
    </div>
  );
}
