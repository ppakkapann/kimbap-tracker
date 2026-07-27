"use client";

import { useEffect, useMemo, useState } from "react";
import { createIngredient } from "@/lib/actions";
import {
  DEFAULT_INGREDIENT_CATEGORY,
  isPackagingCategory,
  normalizeIngredientCategory,
} from "@/lib/ingredient-categories";
import {
  loadRememberedIngredientCategories,
  mergeIngredientCategorySuggestions,
  rememberIngredientCategory,
} from "@/lib/ingredient-category-presets";
import type { Ingredient, IngredientUnit } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/types";
import { UnitPicker } from "@/components/ingredients/UnitPicker";
import { NumberInput } from "@/components/ui";

const CATEGORY_DATALIST_ID = "ingredient-category-suggestions";

export function IngredientForm({
  ingredients = [],
  onSuccess,
}: {
  ingredients?: Ingredient[];
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(DEFAULT_INGREDIENT_CATEGORY);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [unit, setUnit] = useState<IngredientUnit>("g");
  const [unitLabel, setUnitLabel] = useState("");
  const [lowStock, setLowStock] = useState("0");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fromIngredients = useMemo(
    () => ingredients.map((item) => normalizeIngredientCategory(item.category)),
    [ingredients]
  );

  useEffect(() => {
    setCategorySuggestions(
      mergeIngredientCategorySuggestions(
        fromIngredients,
        loadRememberedIngredientCategories()
      )
    );
  }, [fromIngredients]);

  const displayUnit = unitLabel.trim() || UNIT_LABELS[unit];
  const packaging = isPackagingCategory(category);

  function handleCategoryChange(next: string) {
    setCategory(next);
    const normalized = normalizeIngredientCategory(next);
    if (isPackagingCategory(normalized) && unit === "g") {
      setUnit("piece");
      if (!unitLabel.trim()) setUnitLabel("ใบ");
    }
  }

  function handleCategoryBlur() {
    const normalized = normalizeIngredientCategory(category);
    if (!normalized) return;
    setCategory(normalized);
    rememberIngredientCategory(normalized);
    setCategorySuggestions(
      mergeIngredientCategorySuggestions(fromIngredients, loadRememberedIngredientCategories())
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedCategory = normalizeIngredientCategory(category);
    if (!normalizedCategory) {
      setError("ระบุประเภทวัตถุดิบ");
      return;
    }

    setLoading(true);
    setError("");

    const result = await createIngredient({
      name,
      unit,
      unit_label: unitLabel.trim() || null,
      category: normalizedCategory,
      low_stock_alert: parseFloat(lowStock) || 0,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    rememberIngredientCategory(normalizedCategory);
    setName("");
    setCategory(DEFAULT_INGREDIENT_CATEGORY);
    setUnit("g");
    setUnitLabel("");
    setLowStock("0");
    setLoading(false);
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="app-label">ประเภท</span>
        <input
          className="app-input"
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          onBlur={handleCategoryBlur}
          list={CATEGORY_DATALIST_ID}
          placeholder="เช่น อาหาร, บรรจุภัณฑ์, อื่นๆ"
          required
        />
        <datalist id={CATEGORY_DATALIST_ID}>
          {categorySuggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </label>
      <label className="block space-y-1.5">
        <span className="app-label">ชื่อ</span>
        <input
          className="app-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={
            packaging
              ? "เช่น กล่องกินซิง, ตะเกียบ, ถุง"
              : "เช่น ข้าว, แครอท, สาหร่าย"
          }
        />
      </label>
        <UnitPicker value={unit} onChange={setUnit} mode="storage" label="หน่วยเก็บสต็อก" />

      <label className="block space-y-1.5">
        <span className="app-label">เรียกว่า (ไม่บังคับ)</span>
        <input
          className="app-input"
          value={unitLabel}
          onChange={(e) => setUnitLabel(e.target.value)}
          placeholder={`เช่น แผ่น (default: ${UNIT_LABELS[unit]})`}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="app-label">แจ้งเตือนเมื่อสต็อกต่ำกว่า</span>
        <div className="flex items-center gap-2">
          <NumberInput
            className="min-w-0 flex-1"
            value={lowStock}
            onChange={(e) => setLowStock(e.target.value)}
            allowDecimals
            decimals={2}
          />
          <span
            className="shrink-0 text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {displayUnit}
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          หน่วยเดียวกับสต็อกปัจจุบัน · ใส่ 0 เพื่อปิดการแจ้งเตือน
        </p>
      </label>
      {packaging && (
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          บรรจุภัณฑ์ต่อม้วน → บันทึกซื้อที่สต็อก แล้วใส่ในสูตรเมนู · ไม่ต้องลงบัญชีซ้ำ
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full">
        {loading ? "กำลังบันทึก..." : "เพิ่มรายการ"}
      </button>
    </form>
  );
}
