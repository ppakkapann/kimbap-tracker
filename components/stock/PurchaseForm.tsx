"use client";

import { useMemo, useState } from "react";
import { recordPurchase } from "@/lib/actions";
import { groupIngredientsForSelect } from "@/lib/ingredient-categories";
import type { Ingredient, IngredientUnit } from "@/lib/types";
import {
  getIngredientBaseUnit,
  getIngredientUnitLabel,
} from "@/lib/types";
import {
  convertToBase,
  formatQuantityWithHintText,
  getUnitFamily,
  normalizeStorageUnit,
} from "@/lib/unit-conversion";
import { UnitPicker } from "@/components/ingredients/UnitPicker";
import { FormStockHero } from "@/components/ui/FormStockHero";
import { DatePicker, NumberInput } from "@/components/ui";
import { nativeSelectStyle } from "@/components/ui/native-controls";
import { format } from "date-fns";

function defaultPurchaseUnit(ingredient: Ingredient): IngredientUnit {
  const family = getUnitFamily(normalizeStorageUnit(ingredient.unit));
  if (family === "mass") return "g";
  if (family === "volume") return "ml";
  return "piece";
}

export function PurchaseForm({
  ingredients,
  defaultIngredientId,
  onSuccess,
}: {
  ingredients: Ingredient[];
  defaultIngredientId?: string;
  onSuccess?: () => void;
}) {
  const [ingredientId, setIngredientId] = useState(
    defaultIngredientId || ingredients[0]?.id || ""
  );
  const [purchaseUnit, setPurchaseUnit] = useState<IngredientUnit>(() => {
    const ing = ingredients.find(
      (i) => i.id === (defaultIngredientId || ingredients[0]?.id)
    );
    return ing ? defaultPurchaseUnit(ing) : "g";
  });
  const [quantity, setQuantity] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [supplier, setSupplier] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = ingredients.find((i) => i.id === ingredientId);
  const baseUnit = selected ? getIngredientBaseUnit(selected) : "g";
  const storageLabel = selected ? getIngredientUnitLabel(selected) : "กรัม";
  const unitFamily = selected
    ? getUnitFamily(normalizeStorageUnit(selected.unit))
    : "mass";

  const qtyNum = parseFloat(quantity);
  const priceNum = parseFloat(totalPrice);

  const baseQuantity =
    selected && qtyNum > 0
      ? convertToBase(qtyNum, purchaseUnit)
      : null;

  const stockDelta =
    baseQuantity != null && baseQuantity > 0 ? baseQuantity : null;

  const stockAfter =
    selected && stockDelta != null && stockDelta > 0
      ? selected.current_stock + stockDelta
      : null;

  const ingredientGroups = useMemo(
    () => groupIngredientsForSelect(ingredients),
    [ingredients]
  );

  function handleIngredientChange(id: string) {
    setIngredientId(id);
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      setPurchaseUnit(defaultPurchaseUnit(ing));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setLoading(true);
    setError("");

    const result = await recordPurchase({
      ingredient_id: ingredientId,
      quantity: qtyNum,
      purchase_unit: purchaseUnit,
      total_price: priceNum,
      purchased_at: purchasedAt,
      supplier: supplier || undefined,
      expires_at: expiresAt || undefined,
      note: note || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setQuantity("");
    setTotalPrice("");
    setSupplier("");
    setExpiresAt("");
    setNote("");
    setLoading(false);
    onSuccess?.();
  }

  if (ingredients.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        เพิ่มวัตถุดิบก่อนบันทึกการซื้อ
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {selected && (
        <FormStockHero
          unit={storageLabel}
          value={selected.current_stock}
          after={
            stockAfter !== null ? (
              <p className="form-stock-after">
                หลังซื้อ →{" "}
                <strong>
                  {formatQuantityWithHintText(stockAfter, baseUnit, {
                    customLabel: selected.unit_label,
                  })}
                </strong>
              </p>
            ) : null
          }
        />
      )}

      <label className="block min-w-0 space-y-1.5">
        <span className="app-label">วัตถุดิบ</span>
        <select
          value={ingredientId}
          onChange={(e) => handleIngredientChange(e.target.value)}
          className="app-input"
          style={nativeSelectStyle}
        >
          {ingredientGroups.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {group.items.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="app-label">จำนวนซื้อ</span>
          <NumberInput
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="เช่น 1"
            required
            allowDecimals
            decimals={2}
          />
        </label>
        <UnitPicker
          mode="purchase"
          family={unitFamily}
          label="หน่วยซื้อ"
          value={purchaseUnit}
          onChange={setPurchaseUnit}
        />
      </div>

      {baseQuantity != null && baseQuantity > 0 && selected && (
        <p className="text-xs" style={{ color: "var(--accent)" }}>
          = {formatQuantityWithHintText(baseQuantity, baseUnit, {
            customLabel: selected.unit_label,
          })}{" "}
          เข้าสต็อก
        </p>
      )}

      <label className="block space-y-1.5">
        <span className="app-label">ราคารวม (฿)</span>
        <NumberInput
          value={totalPrice}
          onChange={(e) => setTotalPrice(e.target.value)}
          placeholder="เช่น 60"
          required
          allowDecimals
          decimals={2}
        />
      </label>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        กรอกจำนวนที่เข้าสต็อกจริง ({storageLabel}) · ตั้ง % Yield ที่แก้ไขวัตถุดิบสำหรับคิดต้นทุนสูตร
      </p>

      <DatePicker
        label="วันที่ซื้อ"
        value={purchasedAt}
        onChange={setPurchasedAt}
      />

      <label className="purchase-yield-switch">
        <span>
          <strong>รายละเอียดเพิ่มเติม</strong>
          <small>ซัพพลายเออร์ · วันหมดอายุ · หมายเหตุ</small>
        </span>
        <input
          type="checkbox"
          checked={showDetails}
          onChange={(e) => setShowDetails(e.target.checked)}
        />
      </label>

      {showDetails && (
        <div className="purchase-detail-fields space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="app-label">ซัพพลายเออร์</span>
              <input
                className="app-input"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="เช่น ตลาดสด, Makro"
              />
            </label>
            <DatePicker
              label="วันหมดอายุ"
              value={expiresAt}
              onChange={setExpiresAt}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="app-label">หมายเหตุ</span>
            <input
              className="app-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ซื้อจากตลาด, แพ็ค 10 แผ่น"
            />
          </label>
        </div>
      )}

      {error && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--danger-muted)", color: "var(--danger)" }}
        >
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full">
        {loading ? "กำลังบันทึก..." : "+ เติมสต็อก"}
      </button>
    </form>
  );
}
