"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recordSaleBatch } from "@/lib/actions";
import type { ProductWithCost } from "@/lib/types";
import { Input, NumberInput } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { applyGpToRevenue } from "@/lib/sales-channels";
import {
  buildLocationSuggestionValues,
  loadSaleLocationPresets,
  mergeAllLocationPresets,
  normalizeLocationName,
  rememberSaleLocation,
  resolveLocationInput,
  type SaleLocationPreset,
} from "@/lib/sale-location-presets";
import { rememberSalesPageDate } from "@/lib/sales-page-date";
import { format } from "date-fns";

type CartLine = {
  key: string;
  productId: string;
  quantity: number;
};

const LOCATION_DATALIST_ID = "sale-location-suggestions";

function newCartKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyPresetToForm(
  preset: SaleLocationPreset,
  setLocation: (value: string) => void,
  setUseGp: (value: boolean) => void,
  setGpPercent: (value: string) => void
) {
  setLocation(preset.location);
  setUseGp(preset.useGp);
  setGpPercent(String(preset.gpPercent > 0 ? preset.gpPercent : 30));
}

export function QuickSaleForm({
  products,
  defaultSaleDate,
  savedLocationPresets = [],
}: {
  products: ProductWithCost[];
  defaultSaleDate?: string;
  savedLocationPresets?: SaleLocationPreset[];
}) {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");
  const [productId, setProductId] = useState(
    products.find((p) => p.is_active)?.id || ""
  );
  const [quantity, setQuantity] = useState("1");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saleDate, setSaleDate] = useState(defaultSaleDate || today);
  const [location, setLocation] = useState("");
  const [useGp, setUseGp] = useState(false);
  const [gpPercent, setGpPercent] = useState("30");
  const [presets, setPresets] = useState<SaleLocationPreset[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshPresets = useCallback(() => {
    const merged = mergeAllLocationPresets(
      loadSaleLocationPresets(),
      savedLocationPresets
    );
    setPresets(merged);
    setLocationSuggestions(buildLocationSuggestionValues(merged));
    return merged;
  }, [savedLocationPresets]);

  useEffect(() => {
    if (defaultSaleDate) {
      setSaleDate(defaultSaleDate);
    }
  }, [defaultSaleDate]);

  useEffect(() => {
    const merged = refreshPresets();
    const latest = merged[0];
    if (latest) {
      applyPresetToForm(latest, setLocation, setUseGp, setGpPercent);
    }
  }, [refreshPresets]);

  const activeProducts = products.filter((p) => p.is_active);
  const productMap = useMemo(
    () => new Map(activeProducts.map((p) => [p.id, p])),
    [activeProducts]
  );
  const addQty = parseInt(quantity) || 0;
  const gpValue = useGp ? parseFloat(gpPercent) : 0;

  const cartTotals = useMemo(() => {
    let grossRevenue = 0;
    let estimatedRevenue = 0;
    let estimatedCost = 0;
    let totalRolls = 0;

    for (const line of cart) {
      const product = productMap.get(line.productId);
      if (!product) continue;
      const gross = product.selling_price * line.quantity;
      grossRevenue += gross;
      estimatedRevenue += applyGpToRevenue(gross, gpValue);
      estimatedCost += product.costPerRoll * line.quantity;
      totalRolls += line.quantity;
    }

    return {
      grossRevenue,
      estimatedRevenue,
      estimatedCost,
      estimatedProfit: estimatedRevenue - estimatedCost,
      totalRolls,
    };
  }, [cart, productMap, gpValue]);

  function persistCurrentLocationPreset() {
    const clean = normalizeLocationName(location);
    if (!clean || clean.length < 2) return;

    const gp = useGp ? parseFloat(gpPercent) : 0;
    rememberSaleLocation(clean, useGp, useGp ? gp : 0);
    refreshPresets();
  }

  function handleDateChange(value: string) {
    if (!value || value > today) return;
    setSaleDate(value);
    rememberSalesPageDate(value);
    router.push(`/sales?date=${value}`, { scroll: false });
  }

  function handleLocationChange(value: string) {
    setLocation(value);

    const resolved = resolveLocationInput(value, presets);
    if (resolved) {
      applyPresetToForm(resolved, setLocation, setUseGp, setGpPercent);
    }
  }

  function handleLocationBlur() {
    const resolved = resolveLocationInput(location, presets);
    if (resolved) {
      applyPresetToForm(resolved, setLocation, setUseGp, setGpPercent);
    }
    persistCurrentLocationPreset();
  }

  function handleGpSettingsBlur() {
    persistCurrentLocationPreset();
  }

  function handleAddToCart() {
    setError("");
    if (!productId || addQty <= 0) {
      setError("เลือกเมนูและจำนวนที่ถูกต้อง");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((line) => line.productId === productId);
      if (existing) {
        return prev.map((line) =>
          line.productId === productId
            ? { ...line, quantity: line.quantity + addQty }
            : line
        );
      }
      return [...prev, { key: newCartKey(), productId, quantity: addQty }];
    });
    setQuantity("1");
  }

  function handleRemoveLine(key: string) {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }

  function handleUpdateLineQty(key: string, value: string) {
    const qty = parseInt(value) || 0;
    if (qty <= 0) {
      handleRemoveLine(key);
      return;
    }
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, quantity: qty } : line))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      setError("เพิ่มเมนูในตะกร้าก่อนบันทึก");
      return;
    }

    const trimmedLocation = normalizeLocationName(location);
    if (!trimmedLocation) {
      setError("ระบุว่าขายที่ไหน");
      return;
    }

    if (useGp && (!(gpValue > 0) || gpValue > 100)) {
      setError("GP ต้องอยู่ระหว่าง 0.01–100%");
      return;
    }

    setLoading(true);
    setError("");

    const result = await recordSaleBatch({
      items: cart.map((line) => ({
        product_id: line.productId,
        quantity: line.quantity,
      })),
      sale_date: saleDate,
      channel: trimmedLocation,
      gp_percent: useGp ? gpValue : 0,
      note: note || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    rememberSaleLocation(trimmedLocation, useGp, useGp ? gpValue : 0);
    refreshPresets();

    setCart([]);
    setNote("");
    setLoading(false);
    router.refresh();
  }

  if (activeProducts.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        เพิ่มเมนูก่อนบันทึกยอดขาย
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sales-quick-form">
      <div className="sales-quick-form-row sales-quick-form-row--menu">
        <label className="sales-quick-form-field sales-quick-form-menu">
          <span className="app-label">เมนู</span>
          <select
            className="app-input"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.selling_price)}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="จำนวน"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="sales-quick-form-qty"
          required
          decimals={0}
          allowDecimals={false}
        />

        <div className="sales-quick-form-field sales-quick-form-add">
          <span className="app-label sales-quick-form-add-spacer" aria-hidden="true">
            &nbsp;
          </span>
          <button
            type="button"
            className="app-btn app-btn-secondary sales-quick-form-add-btn"
            onClick={handleAddToCart}
          >
            + เพิ่มในตะกร้า
          </button>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="sales-cart-list">
          <p className="app-label">ตะกร้า ({formatNumber(cartTotals.totalRolls, 0)} ม้วน)</p>
          <ul className="sales-cart-items">
            {cart.map((line) => {
              const product = productMap.get(line.productId);
              if (!product) return null;
              return (
                <li key={line.key} className="sales-cart-item">
                  <div className="sales-cart-item-main">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {formatCurrency(product.selling_price)}/ม้วน
                    </span>
                  </div>
                  <div className="sales-cart-item-actions">
                    <NumberInput
                      className="sales-cart-qty"
                      value={line.quantity}
                      onChange={(e) => handleUpdateLineQty(line.key, e.target.value)}
                      decimals={0}
                      allowDecimals={false}
                      plain
                    />
                    <button
                      type="button"
                      className="sales-cart-remove"
                      onClick={() => handleRemoveLine(line.key)}
                    >
                      ลบ
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="sales-quick-form-meta">
        <div className="sales-quick-form-row sales-quick-form-row--meta">
          <label className="sales-quick-form-field sales-quick-form-field--date">
            <span className="app-label">วันที่ขาย</span>
            <input
              className="app-input sales-quick-form-date"
              type="date"
              value={saleDate}
              max={today}
              onChange={(e) => handleDateChange(e.target.value)}
              required
            />
          </label>

          <label className="sales-quick-form-field sales-quick-form-field--location">
            <span className="app-label">ขายที่ไหน</span>
            <input
              className="app-input"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onBlur={handleLocationBlur}
              list={LOCATION_DATALIST_ID}
              placeholder="เช่น เว็บ, หน้าร้าน"
              autoComplete="off"
              required
            />
            <datalist id={LOCATION_DATALIST_ID}>
              {locationSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <div className="sales-quick-form-field sales-quick-form-field--gp">
            <span className="app-label">GP</span>
            <div
              className={`sales-quick-form-gp-box${useGp ? " is-active" : ""}`}
            >
              <label className="sales-quick-form-gp-toggle">
                <input
                  type="checkbox"
                  checked={useGp}
                  onChange={(event) => setUseGp(event.target.checked)}
                  onBlur={handleGpSettingsBlur}
                  aria-label="หัก GP"
                />
                <span>หัก</span>
              </label>
              <div className="sales-quick-form-gp-input-wrap">
                <NumberInput
                  className="sales-quick-form-gp-input"
                  value={gpPercent}
                  onChange={(event) => setGpPercent(event.target.value)}
                  onBlur={handleGpSettingsBlur}
                  disabled={!useGp}
                  required={useGp}
                  aria-label="GP (%)"
                  decimals={2}
                  plain
                />
                <span>%</span>
              </div>
            </div>
          </div>
        </div>

        {locationSuggestions.length > 0 && (
          <p className="sales-quick-form-location-hint">
            เลือกจากรายการที่เคยบันทึก — GP จะถูกเติมให้อัตโนมัติ
          </p>
        )}
      </div>

      <Input
        label="หมายเหตุ"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="เช่น รอบเช้า, ลูกค้าประจำ"
      />

      {cart.length > 0 && (
        <div className="sales-quick-form-estimate">
          {useGp && gpValue > 0 && (
            <p>
              ราคารวม: <strong>{formatCurrency(cartTotals.grossRevenue)}</strong>
              {" · "}
              หัก GP {gpValue}%
            </p>
          )}
          <p>
            รายได้สุทธิ: <strong>{formatCurrency(cartTotals.estimatedRevenue)}</strong>
          </p>
          <p>
            กำไรโดยประมาณ:{" "}
            <strong>{formatCurrency(cartTotals.estimatedProfit)}</strong>
          </p>
        </div>
      )}

      {error && <p className="sales-quick-form-error">{error}</p>}

      <button
        type="submit"
        disabled={loading || cart.length === 0}
        className="app-btn app-btn-primary sales-quick-form-submit"
      >
        {loading
          ? "กำลังบันทึก..."
          : `บันทึก ${formatNumber(cartTotals.totalRolls || 0, 0)} ม้วน (${formatNumber(cart.length, 0)} รายการ)`}
      </button>
    </form>
  );
}
