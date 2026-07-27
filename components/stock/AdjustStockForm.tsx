"use client";

import { useState } from "react";
import { adjustStock } from "@/lib/actions";
import { NumberInput } from "@/components/ui";
import { formatCurrency, formatNumber, parseFormattedNumber } from "@/lib/calculations";
import type { Ingredient } from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";

export function AdjustStockForm({
  ingredients,
  onSuccess,
}: {
  ingredients: Ingredient[];
  onSuccess?: () => void;
}) {
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id || "");
  const [newStock, setNewStock] = useState(
    () => String(ingredients[0]?.current_stock ?? "")
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = ingredients.find((i) => i.id === ingredientId);
  const newStockNumber = parseFormattedNumber(newStock) ?? 0;
  const difference = selected
    ? newStockNumber - selected.current_stock
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await adjustStock({
      ingredient_id: ingredientId,
      new_stock: parseFloat(newStock),
      note: note || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setNewStock("");
    setNote("");
    setLoading(false);
    onSuccess?.();
  }

  if (ingredients.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="app-label">วัตถุดิบ</span>
        <select
          value={ingredientId}
          onChange={(e) => {
            setIngredientId(e.target.value);
            const ing = ingredients.find((i) => i.id === e.target.value);
            if (ing) setNewStock(String(ing.current_stock));
          }}
          className="app-input"
        >
          {ingredients.map((ing) => (
            <option key={ing.id} value={ing.id}>
              {ing.name} (คงเหลือ {ing.current_stock} {getIngredientUnitLabel(ing)})
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="app-label">
          สต็อกใหม่ ({selected ? getIngredientUnitLabel(selected) : ""})
        </span>
        <NumberInput
          value={newStock}
          onChange={(e) => setNewStock(e.target.value)}
          required
          allowDecimals
          decimals={2}
        />
      </label>
      {selected && newStock !== "" && Number.isFinite(newStockNumber) && (
        <div className="stock-count-preview">
          <div>
            <span>ยอดในระบบ</span>
            <strong>
              {formatNumber(selected.current_stock, 0)}{" "}
              {getIngredientUnitLabel(selected)}
            </strong>
          </div>
          <div>
            <span>นับได้จริง</span>
            <strong>
              {formatNumber(newStockNumber, 0)}{" "}
              {getIngredientUnitLabel(selected)}
            </strong>
          </div>
          <div>
            <span>ส่วนต่าง</span>
            <strong
              style={{
                color:
                  difference < 0
                    ? "var(--danger)"
                    : difference > 0
                      ? "var(--success)"
                      : "var(--text-secondary)",
              }}
            >
              {difference > 0 ? "+" : ""}
              {formatNumber(difference, 0)}{" "}
              {getIngredientUnitLabel(selected)}
            </strong>
          </div>
          <div>
            <span>มูลค่าส่วนต่าง</span>
            <strong>{formatCurrency(Math.abs(difference) * selected.avg_unit_cost)}</strong>
          </div>
        </div>
      )}
      <label className="block space-y-1.5">
        <span className="app-label">หมายเหตุ</span>
        <input
          className="app-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น นับสต็อกจริง"
        />
      </label>

      {error && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--danger-muted)", color: "var(--danger)" }}
        >
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full">
        {loading ? "กำลังบันทึก..." : "ปรับยอดสต็อก"}
      </button>
    </form>
  );
}
