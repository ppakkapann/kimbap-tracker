"use client";

import { useMemo, useState } from "react";
import {
  recordIngredientWaste,
  recordProductWaste,
} from "@/lib/actions";
import { NumberInput } from "@/components/ui";
import { formatCurrency, formatNumber, parseFormattedNumber } from "@/lib/calculations";
import { usageQuantityFromRecipe } from "@/lib/recipe-batch";
import type {
  Ingredient,
  Product,
  RecipeItem,
  StockMovementReason,
} from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";
import { YIELD_UNIT } from "@/lib/yield-unit";

type WasteReason = Exclude<StockMovementReason, "count">;
type SourceMode = "ingredient" | "product";

const REASONS: { value: WasteReason; label: string }[] = [
  { value: "spoilage", label: "ของเสีย / หมดอายุ" },
  { value: "unsold", label: "ทำแล้วขายไม่หมด" },
  { value: "test", label: "ทดลอง / ชิม / แจก" },
  { value: "personal", label: "ใช้ส่วนตัว" },
  { value: "other", label: "อื่นๆ" },
];

export function StockOutForm({
  ingredients,
  products,
  recipeItems,
  onSuccess,
}: {
  ingredients: Ingredient[];
  products: Product[];
  recipeItems: RecipeItem[];
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<SourceMode>("ingredient");
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? "");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<WasteReason>("spoilage");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedIngredient = ingredients.find((i) => i.id === ingredientId);
  const selectedProduct = products.find((p) => p.id === productId);
  const numericQuantity = parseFormattedNumber(quantity) ?? 0;

  const productDeductions = useMemo(() => {
    if (!selectedProduct || numericQuantity <= 0) return [];
    return recipeItems
      .filter((item) => item.product_id === selectedProduct.id)
      .map((item) => {
        const ingredient = ingredients.find(
          (ing) => ing.id === item.ingredient_id
        );
        const required = usageQuantityFromRecipe(item, numericQuantity);
        return { ingredient, required };
      })
      .filter(
        (
          row
        ): row is { ingredient: Ingredient; required: number } =>
          row.ingredient !== undefined
      );
  }, [ingredients, numericQuantity, recipeItems, selectedProduct]);

  const estimatedValue =
    mode === "ingredient"
      ? numericQuantity * (selectedIngredient?.avg_unit_cost ?? 0)
      : productDeductions.reduce(
          (sum, row) => sum + row.required * row.ingredient.avg_unit_cost,
          0
        );
  const productInsufficient = productDeductions.some(
    (row) => row.required > row.ingredient.current_stock
  );

  function changeMode(nextMode: SourceMode) {
    setMode(nextMode);
    setQuantity("");
    setError("");
    setMessage("");
    if (nextMode === "product" && reason === "spoilage") setReason("unsold");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const result =
      mode === "ingredient"
        ? await recordIngredientWaste({
            ingredient_id: ingredientId,
            quantity: numericQuantity,
            reason,
            note: note || undefined,
          })
        : await recordProductWaste({
            product_id: productId,
            quantity: numericQuantity,
            reason,
            note: note || undefined,
          });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setQuantity("");
    setNote("");
    setMessage("บันทึกการตัดออกเรียบร้อย");
    onSuccess?.();
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => changeMode("ingredient")}
          className={`stock-mode-button ${
            mode === "ingredient" ? "stock-mode-button--active" : ""
          }`}
        >
          ตัดวัตถุดิบ
          <span>เสีย · ใช้ส่วนตัว · อื่นๆ</span>
        </button>
        <button
          type="button"
          onClick={() => changeMode("product")}
          className={`stock-mode-button ${
            mode === "product" ? "stock-mode-button--active" : ""
          }`}
        >
          เมนูขายไม่หมด
          <span>หักวัตถุดิบตามสูตร</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "ingredient" ? (
          <label className="block space-y-1.5">
            <span className="app-label">วัตถุดิบ</span>
            <select
              className="app-input"
              value={ingredientId}
              onChange={(event) => setIngredientId(event.target.value)}
            >
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} · คงเหลือ{" "}
                  {formatNumber(ingredient.current_stock, 0)}{" "}
                  {getIngredientUnitLabel(ingredient)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block space-y-1.5">
            <span className="app-label">เมนู</span>
            <select
              className="app-input"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="app-label">
              จำนวน{" "}
              {mode === "ingredient"
                ? `(${selectedIngredient ? getIngredientUnitLabel(selectedIngredient) : ""})`
                : `(${YIELD_UNIT})`}
            </span>
            <NumberInput
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
              allowDecimals={mode !== "product"}
              decimals={mode === "product" ? 0 : 2}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="app-label">เหตุผล</span>
            <select
              className="app-input"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as WasteReason)
              }
            >
              {REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {mode === "product" &&
          numericQuantity > 0 &&
          (productDeductions.length > 0 ? (
            <div className="stock-deduction-preview">
              <p className="text-xs font-medium">วัตถุดิบที่จะถูกตัดออก</p>
              <div className="mt-2 space-y-1.5">
                {productDeductions.map(({ ingredient, required }) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      {ingredient.name}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        color:
                          required > ingredient.current_stock
                            ? "var(--danger)"
                            : undefined,
                      }}
                    >
                      -{formatNumber(required, 0)}{" "}
                      {getIngredientUnitLabel(ingredient)}
                      {required > ingredient.current_stock && " · ไม่พอ"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                color: "var(--warning)",
                background: "var(--warning-muted)",
              }}
            >
              เมนูนี้ยังไม่มีสูตรวัตถุดิบ
            </p>
          ))}

        <label className="block space-y-1.5">
          <span className="app-label">หมายเหตุ (ไม่บังคับ)</span>
          <input
            className="app-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="เช่น ผักช้ำ, ทำเกิน 2 ม้วน"
          />
        </label>

        {numericQuantity > 0 && (
          <div className="stock-loss-estimate">
            <span>มูลค่าที่ตัดออกโดยประมาณ</span>
            <strong>{formatCurrency(estimatedValue)}</strong>
          </div>
        )}

        {error && (
          <p
            className="rounded-lg px-3 py-2 text-sm"
            style={{ color: "var(--danger)", background: "var(--danger-muted)" }}
          >
            {error}
          </p>
        )}
        {message && (
          <p
            className="rounded-lg px-3 py-2 text-sm"
            style={{
              color: "var(--success)",
              background: "var(--success-muted)",
            }}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            numericQuantity <= 0 ||
            (mode === "product" && productInsufficient) ||
            (mode === "ingredient" ? !ingredientId : !productId)
          }
          className="app-btn app-btn-danger w-full"
        >
          {loading ? "กำลังบันทึก..." : "ยืนยันการตัดออก"}
        </button>
      </form>
    </div>
  );
}
