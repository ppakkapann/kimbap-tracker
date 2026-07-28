"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  deleteIngredient,
  saveIngredientRecipeRows,
  updateIngredient,
} from "@/lib/actions";
import { formatNumber } from "@/lib/calculations";
import { NumberInput } from "@/components/ui";
import {
  qtyPerRollFromPurchaseBatch,
  rollsFromPurchaseBatch,
} from "@/lib/recipe-batch";
import {
  getCategoryFilterStyle,
  getDistinctCategories,
  normalizeIngredientCategory,
} from "@/lib/ingredient-categories";
import {
  DEFAULT_INGREDIENT_CATEGORY_SUGGESTIONS,
  loadRememberedIngredientCategories,
  mergeIngredientCategorySuggestions,
  rememberIngredientCategory,
} from "@/lib/ingredient-category-presets";
import type { Ingredient, IngredientUnit } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/types";
import { yieldPercentFromQuantities } from "@/lib/purchase-yield";
import { PREP_ESTIMATE_PRESETS } from "@/lib/purchase-prep";
import { YIELD_UNIT } from "@/lib/yield-unit";
import type { IngredientRecipeMenuLink } from "@/lib/recipe-index";
import {
  getUnitFamily,
  normalizeStorageUnit,
} from "@/lib/unit-conversion";
import { SegmentToggle } from "@/components/ui";
import { UnitPicker } from "@/components/ingredients/UnitPicker";

type RecipeInputMode = "perRoll" | "fromPurchase";

function initialNoYieldLoss(ingredient: Ingredient): boolean {
  const pct = ingredient.price_ref_yield_percent ?? 100;
  return pct >= 100;
}

function initialRollsFromPurchase(
  purchaseQty: number,
  qtyPerRoll: number
): string {
  if (purchaseQty > 0 && qtyPerRoll > 0) {
    const rolls = rollsFromPurchaseBatch(purchaseQty, qtyPerRoll);
    return rolls > 0 ? String(rolls) : "";
  }
  return "";
}

export function IngredientEditModal({
  ingredient,
  quantityPerRoll,
  productId,
  productName,
  recipeMenus = [],
  onClose,
  onDeleted,
}: {
  ingredient: Ingredient;
  quantityPerRoll: number;
  productId: string;
  productName?: string;
  recipeMenus?: IngredientRecipeMenuLink[];
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(ingredient.name);
  const [category, setCategory] = useState(
    normalizeIngredientCategory(ingredient.category)
  );
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [unit, setUnit] = useState<IngredientUnit>(() =>
    normalizeStorageUnit(ingredient.unit)
  );
  const [unitLabel, setUnitLabel] = useState(ingredient.unit_label ?? "");
  const [currentStock, setCurrentStock] = useState(
    Math.round(ingredient.current_stock * 100) / 100
  );
  const [lowStock, setLowStock] = useState(ingredient.low_stock_alert);
  const [yieldGross, setYieldGross] = useState(
    ingredient.price_ref_quantity != null
      ? String(ingredient.price_ref_quantity)
      : ""
  );
  const initialYieldNet = (() => {
    const gross = ingredient.price_ref_quantity ?? 0;
    const yieldPct = ingredient.price_ref_yield_percent ?? 100;
    if (gross <= 0) return "";
    if (yieldPct >= 100) return String(gross);
    return String(Math.round(gross * (yieldPct / 100) * 100) / 100);
  })();

  const [yieldNet, setYieldNet] = useState(initialYieldNet);
  const [qtyPerRoll, setQtyPerRoll] = useState(quantityPerRoll);
  const [recipeInputMode, setRecipeInputMode] =
    useState<RecipeInputMode>("perRoll");
  const [rollsFromPurchaseInput, setRollsFromPurchaseInput] = useState(() =>
    initialRollsFromPurchase(
      ingredient.price_ref_quantity ?? 0,
      quantityPerRoll
    )
  );
  const [noYieldLoss, setNoYieldLoss] = useState(() =>
    initialNoYieldLoss(ingredient)
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCategorySuggestions(
      mergeIngredientCategorySuggestions(
        [normalizeIngredientCategory(ingredient.category)],
        loadRememberedIngredientCategories()
      )
    );
  }, [ingredient.category]);

  const categoryOptions = useMemo(
    () =>
      mergeIngredientCategorySuggestions(
        [normalizeIngredientCategory(category), ...DEFAULT_INGREDIENT_CATEGORY_SUGGESTIONS],
        categorySuggestions
      ),
    [category, categorySuggestions]
  );

  const allCategoriesForStyle = useMemo(
    () =>
      getDistinctCategories([
        { category },
        ...categoryOptions.map((item) => ({ category: item })),
      ]),
    [category, categoryOptions]
  );

  const displayUnit = unitLabel.trim() || UNIT_LABELS[normalizeStorageUnit(unit)];

  function handleUnitChange(next: IngredientUnit) {
    const currentFamily = getUnitFamily(normalizeStorageUnit(unit));
    const nextFamily = getUnitFamily(normalizeStorageUnit(next));
    if (
      currentFamily !== nextFamily &&
      !confirm(
        "เปลี่ยนประเภทหน่วย (เช่น กรัม → ชิ้น) จะไม่แปลงตัวเลขสต็อก/สูตรโดยอัตโนมัติ — ต้องการดำเนินการต่อ?"
      )
    ) {
      return;
    }
    setUnit(next);
  }
  const yieldGrossNum = parseFloat(yieldGross);
  const yieldNetNum = parseFloat(yieldNet);
  const yieldNum = noYieldLoss
    ? 100
    : yieldGrossNum > 0 && yieldNetNum > 0
      ? yieldPercentFromQuantities(yieldGrossNum, yieldNetNum)
      : ingredient.price_ref_yield_percent ?? 100;

  function handleYieldGrossChange(value: string) {
    setYieldGross(value);
    const qtyNum = parseFloat(value);
    if (recipeInputMode !== "fromPurchase") return;
    const rollsNum = parseFloat(rollsFromPurchaseInput);
    if (qtyNum > 0 && rollsNum > 0) {
      setQtyPerRoll(qtyPerRollFromPurchaseBatch(qtyNum, rollsNum));
    }
  }

  function handleQtyPerRollChange(value: string) {
    const next = value === "" ? 0 : Number(value);
    setQtyPerRoll(next);
    if (yieldGrossNum > 0 && next > 0) {
      setRollsFromPurchaseInput(
        String(rollsFromPurchaseBatch(yieldGrossNum, next))
      );
    }
  }

  function handleRollsFromPurchaseChange(value: string) {
    setRollsFromPurchaseInput(value);
    const rollsNum = parseFloat(value);
    if (yieldGrossNum > 0 && rollsNum > 0) {
      setQtyPerRoll(qtyPerRollFromPurchaseBatch(yieldGrossNum, rollsNum));
    } else if (value === "") {
      setQtyPerRoll(0);
    }
  }

  function switchRecipeInputMode(mode: RecipeInputMode) {
    setRecipeInputMode(mode);
    if (
      mode === "fromPurchase" &&
      yieldGrossNum > 0 &&
      qtyPerRoll > 0 &&
      !rollsFromPurchaseInput
    ) {
      setRollsFromPurchaseInput(
        String(rollsFromPurchaseBatch(yieldGrossNum, qtyPerRoll))
      );
    }
  }

  function selectCategory(next: string) {
    const normalized = normalizeIngredientCategory(next);
    setCategory(normalized);
    rememberIngredientCategory(normalized);
    setCategorySuggestions(
      mergeIngredientCategorySuggestions(
        [normalized],
        loadRememberedIngredientCategories()
      )
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const normalizedCategory = normalizeIngredientCategory(category);
    if (!normalizedCategory) {
      setError("ระบุประเภทวัตถุดิบ");
      return;
    }

    if (!noYieldLoss && yieldGrossNum > 0) {
      if (!(yieldNetNum > 0) || yieldNetNum > yieldGrossNum) {
        setError("กรอกน้ำหนักหลังแต่ง (สุทธิ) ให้ถูกต้อง");
        return;
      }
    }

    if (!noYieldLoss && (!(yieldNum > 0) || yieldNum > 100)) {
      setError("Yield % ไม่ถูกต้อง");
      return;
    }

    setLoading(true);
    setError("");

    const updateResult = await updateIngredient(ingredient.id, {
      name: name.trim(),
      unit,
      unit_label: unitLabel.trim() || null,
      category: normalizedCategory,
      low_stock_alert: lowStock,
      price_ref_yield_percent: noYieldLoss ? 100 : yieldNum,
      ...(!noYieldLoss && yieldGrossNum > 0
        ? { price_ref_quantity: yieldGrossNum }
        : {}),
    });

    if (updateResult.error) {
      setError(updateResult.error);
      setLoading(false);
      return;
    }

    const result = await saveIngredientRecipeRows(productId, [
      {
        id: ingredient.id,
        name: name.trim(),
        unit,
        currentStock,
        purchaseQuantity: 0,
        purchaseTotalPrice: 0,
        quantityPerRoll: qtyPerRoll,
      },
    ]);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    rememberIngredientCategory(normalizedCategory);
    router.refresh();
    onClose();
  }

  async function handleDelete() {
    if (!confirm(`ลบ "${ingredient.name}" และข้อมูลที่เกี่ยวข้อง?`)) return;

    setDeleting(true);
    setError("");

    const result = await deleteIngredient(ingredient.id);

    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    onDeleted?.();
    onClose();
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="app-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ingredient-edit-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="ingredient-edit-title"
      >
        <header className="ingredient-edit-modal-head">
          <div className="min-w-0">
            <h2 id="ingredient-edit-title" className="ingredient-edit-modal-title">
              แก้ไขวัตถุดิบ
            </h2>
            {productName ? (
              <p className="ingredient-edit-modal-subtitle">
                สูตรเมนู · {productName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ingredient-edit-modal-close"
            aria-label="ปิด"
          >
            ×
          </button>
        </header>

        <div
          className="ingredient-edit-category-pills ingredient-edit-modal-categories"
          role="group"
          aria-label="ประเภทวัตถุดิบ"
        >
          {categoryOptions.map((option) => {
            const active =
              normalizeIngredientCategory(category) ===
              normalizeIngredientCategory(option);
            const style = getCategoryFilterStyle(
              option,
              allCategoriesForStyle,
              active
            );
            return (
              <button
                key={option}
                type="button"
                className={`ingredient-edit-category-pill${active ? " is-active" : ""}`}
                style={
                  active
                    ? {
                        color: style.color,
                        background: style.background,
                        borderColor: style.borderColor,
                      }
                    : { borderColor: style.borderColor }
                }
                onClick={() => selectCategory(option)}
              >
                {option}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="ingredient-edit-modal-form">
          <div className="ingredient-edit-modal-body">
            <section className="ingredient-edit-section">
              <div className="ingredient-edit-grid ingredient-edit-grid--2">
                <label className="ingredient-edit-field">
                  <span className="app-label">ชื่อวัตถุดิบ</span>
                  <input
                    className="app-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>
                <UnitPicker
                  value={unit}
                  onChange={handleUnitChange}
                  label="หน่วยเก็บสต็อก"
                  mode="storage"
                />
              </div>

              <label className="ingredient-edit-field ingredient-edit-field--compact">
                <span className="app-label">เรียกว่า (ไม่บังคับ)</span>
                <input
                  className="app-input"
                  value={unitLabel}
                  onChange={(event) => setUnitLabel(event.target.value)}
                  placeholder={`เช่น แผ่น (default: ${UNIT_LABELS[normalizeStorageUnit(unit)]})`}
                />
              </label>
            </section>

            <section className="ingredient-edit-section ingredient-edit-section--panel">
              <h3 className="ingredient-edit-section-title">สต็อก</h3>
              <div className="ingredient-edit-grid ingredient-edit-grid--2">
                <label className="ingredient-edit-field">
                  <span className="app-label">คงเหลือ ({displayUnit})</span>
                  <NumberInput
                    value={currentStock}
                    onChange={(event) =>
                      setCurrentStock(Number(event.target.value) || 0)
                    }
                    allowDecimals
                    decimals={2}
                  />
                </label>
                <label className="ingredient-edit-field">
                  <span className="app-label">แจ้งเตือน &lt;</span>
                  <div className="ingredient-edit-unit-input">
                    <NumberInput
                      className="min-w-0 flex-1"
                      value={lowStock}
                      onChange={(event) =>
                        setLowStock(Number(event.target.value) || 0)
                      }
                      allowDecimals
                      decimals={2}
                    />
                    <span className="ingredient-edit-unit-suffix">{displayUnit}</span>
                  </div>
                </label>
              </div>
            </section>

            <section className="ingredient-edit-section">
              {noYieldLoss ? (
                <button
                  type="button"
                  className="ingredient-no-yield-btn is-active"
                  onClick={() => setNoYieldLoss(false)}
                >
                  วัตถุดิบนี้ไม่มีการสูญเสีย (Yield 100%)
                </button>
              ) : (
                <div className="ingredient-edit-section ingredient-edit-section--panel">
                  <div className="ingredient-edit-section-head">
                    <div className="ingredient-edit-section-head-main">
                      <h3 className="ingredient-edit-section-title">
                        Yield สำหรับคิดต้นทุนสูตร
                      </h3>
                      <span className="ingredient-edit-yield-badge ingredient-edit-yield-badge--active">
                        {yieldGrossNum > 0 && yieldNetNum > 0
                          ? `${formatNumber(yieldNum, 1)}%`
                          : ingredient.price_ref_yield_percent != null
                            ? `${formatNumber(ingredient.price_ref_yield_percent, 1)}%`
                            : "—"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ingredient-no-yield-btn ingredient-no-yield-btn--compact"
                      onClick={() => setNoYieldLoss(true)}
                    >
                      ไม่มีสูญเสีย
                    </button>
                  </div>

                  <div className="ingredient-edit-yield-body">
                    <div className="ingredient-edit-grid ingredient-edit-grid--2">
                      <label className="ingredient-edit-field">
                        <span className="ingredient-edit-field-sublabel">ก่อนแต่ง (ดิบ)</span>
                        <div className="ingredient-edit-unit-input">
                          <NumberInput
                            className="min-w-0 flex-1"
                            value={yieldGross}
                            placeholder="1,000"
                            onChange={(event) =>
                              handleYieldGrossChange(event.target.value)
                            }
                            allowDecimals
                            decimals={2}
                          />
                          <span className="ingredient-edit-unit-suffix">{displayUnit}</span>
                        </div>
                      </label>
                      <label className="ingredient-edit-field">
                        <span className="ingredient-edit-field-sublabel">หลังแต่ง (สุทธิ)</span>
                        <div className="ingredient-edit-unit-input">
                          <NumberInput
                            className="min-w-0 flex-1"
                            value={yieldNet}
                            onChange={(event) => setYieldNet(event.target.value)}
                            placeholder={yieldGross || "750"}
                            allowDecimals
                            decimals={2}
                          />
                          <span className="ingredient-edit-unit-suffix">{displayUnit}</span>
                        </div>
                      </label>
                    </div>

                    {yieldGrossNum > 0 && (
                      <div className="purchase-prep-estimates ingredient-edit-prep-estimates">
                        <span className="purchase-prep-estimates-label">ประมาณการ</span>
                        {PREP_ESTIMATE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            className="purchase-prep-estimate-btn"
                            onClick={() =>
                              setYieldNet(
                                String(
                                  Math.round(yieldGrossNum * preset.ratio * 100) / 100
                                )
                              )
                            }
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {productId ? (
              <section className="ingredient-edit-section ingredient-edit-section--panel">
                <h3 className="ingredient-edit-section-title">
                  สูตรต่อ{YIELD_UNIT}
                </h3>
                <div className="ingredient-edit-recipe-layout">
                  <SegmentToggle
                    className="app-segment-toggle--equal ingredient-edit-recipe-toggle"
                    ariaLabel="วิธีกรอกสูตร"
                    value={recipeInputMode}
                    onChange={switchRecipeInputMode}
                    options={[
                      { value: "perRoll", label: `ใช้ต่อ${YIELD_UNIT}` },
                      { value: "fromPurchase", label: "จากการซื้อ" },
                    ]}
                  />

                  {recipeInputMode === "perRoll" ? (
                    <label className="ingredient-edit-field ingredient-edit-recipe-input">
                      <span className="ingredient-edit-field-sublabel">
                        {displayUnit}/{YIELD_UNIT}
                      </span>
                      <NumberInput
                        value={qtyPerRoll || ""}
                        placeholder="75"
                        onChange={(event) =>
                          handleQtyPerRollChange(event.target.value)
                        }
                        allowDecimals
                        decimals={2}
                      />
                      {yieldGrossNum > 0 && qtyPerRoll > 0 ? (
                        <p className="ingredient-edit-hint">
                          จาก {formatNumber(yieldGrossNum, 0)} {displayUnit} →{" "}
                          {formatNumber(
                            rollsFromPurchaseBatch(yieldGrossNum, qtyPerRoll),
                            0
                          )}{" "}
                          {YIELD_UNIT}
                        </p>
                      ) : null}
                    </label>
                  ) : (
                    <label className="ingredient-edit-field ingredient-edit-recipe-input">
                      <span className="ingredient-edit-field-sublabel">
                        {YIELD_UNIT} จาก{" "}
                        {yieldGrossNum > 0 ? formatNumber(yieldGrossNum, 0) : "…"}{" "}
                        {displayUnit}
                      </span>
                      <NumberInput
                        value={rollsFromPurchaseInput}
                        placeholder="4"
                        disabled={!(yieldGrossNum > 0)}
                        onChange={(event) =>
                          handleRollsFromPurchaseChange(event.target.value)
                        }
                        allowDecimals
                        decimals={2}
                      />
                      {!(yieldGrossNum > 0) ? (
                        <p className="ingredient-edit-hint ingredient-edit-hint--warning">
                          กรอกน้ำหนักก่อนแต่งก่อน
                        </p>
                      ) : qtyPerRoll > 0 ? (
                        <p className="ingredient-edit-hint">
                          = {formatNumber(qtyPerRoll, 2)} {displayUnit}/{YIELD_UNIT}
                        </p>
                      ) : null}
                    </label>
                  )}
                </div>
              </section>
            ) : null}

            {!productId ? (
              <section className="ingredient-edit-section ingredient-edit-section--panel">
                <h3 className="ingredient-edit-section-title">ใช้ในสูตรเมนู</h3>
                {recipeMenus.length === 0 ? (
                  <p className="ingredient-edit-hint">
                    ยังไม่ถูกใช้ในเมนูใด — แก้สูตรได้ที่หน้าเมนู
                  </p>
                ) : (
                  <ul className="ingredient-edit-recipe-menu-list">
                    {recipeMenus.map((menu) => (
                      <li key={menu.productId}>
                        <Link
                          href={`/products/${menu.productId}`}
                          className="ingredient-edit-recipe-menu-link"
                          onClick={onClose}
                        >
                          <span className="ingredient-edit-recipe-menu-name">
                            {menu.productName}
                          </span>
                          <span className="ingredient-edit-recipe-menu-qty tabular-nums">
                            {formatNumber(menu.quantityPerRoll, 2)} / {YIELD_UNIT}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </div>

          <footer className="ingredient-edit-modal-foot">
            {error ? (
              <p className="ingredient-edit-modal-error">{error}</p>
            ) : null}
            <div className="ingredient-edit-modal-actions">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || deleting}
                className="ingredient-edit-delete-link"
              >
                {deleting ? "กำลังลบ..." : "ลบวัตถุดิบ"}
              </button>
              <div className="ingredient-edit-modal-action-buttons">
                <button
                  type="button"
                  onClick={onClose}
                  className="app-btn app-btn-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading || deleting || !name.trim()}
                  className="app-btn app-btn-primary"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}
