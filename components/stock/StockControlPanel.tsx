"use client";

import { useState } from "react";
import { AdjustStockForm } from "@/components/stock/AdjustStockForm";
import { StockOutForm } from "@/components/stock/StockOutForm";
import type { Ingredient, Product, Purchase, RecipeItem } from "@/lib/types";

type ControlMode = "out" | "count";

export function StockControlPanel({
  ingredients,
  products,
  recipeItems,
  onSuccess,
  embedded = false,
}: {
  ingredients: Ingredient[];
  products: Product[];
  recipeItems: RecipeItem[];
  purchases?: Purchase[];
  onSuccess?: () => void;
  embedded?: boolean;
}) {
  const [mode, setMode] = useState<ControlMode>("out");

  return (
    <div className={embedded ? "" : "max-w-2xl"}>
      <div className="app-tabs mb-4">
        <button
          type="button"
          onClick={() => setMode("out")}
          className={`app-tab ${mode === "out" ? "app-tab-active" : ""}`}
        >
          ตัดออก
        </button>
        <button
          type="button"
          onClick={() => setMode("count")}
          className={`app-tab ${mode === "count" ? "app-tab-active" : ""}`}
        >
          ตรวจนับ
        </button>
      </div>

      <div className={embedded ? "" : "app-card"}>
        <h2 className="app-section-title mb-1">
          {mode === "out" ? "ตัดสต็อกออก" : "ตรวจนับสต็อกจริง"}
        </h2>
        <p className="mb-5 text-xs" style={{ color: "var(--text-muted)" }}>
          {mode === "out"
            ? "บันทึกของเสีย ขายไม่หมด ทดลอง หรือใช้ส่วนตัว พร้อมมูลค่าที่สูญเสีย"
            : "กรอกยอดที่นับได้จริง ระบบจะบันทึกส่วนต่างให้อัตโนมัติ"}
        </p>

        {mode === "out" ? (
          <StockOutForm
            ingredients={ingredients}
            products={products}
            recipeItems={recipeItems}
            onSuccess={onSuccess}
          />
        ) : (
          <AdjustStockForm ingredients={ingredients} onSuccess={onSuccess} />
        )}
      </div>
    </div>
  );
}
