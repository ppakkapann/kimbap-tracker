"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSale, updateSale } from "@/lib/actions";
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
import { formatCurrency } from "@/lib/calculations";
import type { ProductWithCost, Sale } from "@/lib/types";
import { format } from "date-fns";
import { Input, NumberInput, AppModal } from "@/components/ui";

const LOCATION_DATALIST_ID = "sale-edit-location-suggestions";

export function SaleEditModal({
  sale,
  products,
  savedLocationPresets = [],
  onClose,
}: {
  sale: Sale;
  products: ProductWithCost[];
  savedLocationPresets?: SaleLocationPreset[];
  onClose: () => void;
}) {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");
  const activeProducts = products.filter((p) => p.is_active);

  const [productId, setProductId] = useState(sale.product_id);
  const [quantity, setQuantity] = useState(String(sale.quantity));
  const [saleDate, setSaleDate] = useState(sale.sale_date);
  const [location, setLocation] = useState(normalizeLocationName(sale.channel));
  const [useGp, setUseGp] = useState((sale.gp_percent ?? 0) > 0);
  const [gpPercent, setGpPercent] = useState(
    String(sale.gp_percent && sale.gp_percent > 0 ? sale.gp_percent : 30)
  );
  const [note, setNote] = useState(sale.note ?? "");
  const [presets, setPresets] = useState<SaleLocationPreset[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    refreshPresets();
  }, [refreshPresets]);

  const selectedProduct = activeProducts.find((p) => p.id === productId);
  const qtyNum = parseInt(quantity) || 0;
  const gpValue = useGp ? parseFloat(gpPercent) : 0;

  const preview = useMemo(() => {
    if (!selectedProduct || qtyNum <= 0) {
      return { revenue: 0, profit: 0 };
    }
    const gross = selectedProduct.selling_price * qtyNum;
    const revenue = applyGpToRevenue(gross, gpValue);
    const profit = revenue - selectedProduct.costPerRoll * qtyNum;
    return { revenue, profit };
  }, [selectedProduct, qtyNum, gpValue]);

  function handleLocationChange(value: string) {
    setLocation(value);
    const resolved = resolveLocationInput(value, presets);
    if (resolved) {
      setLocation(resolved.location);
      setUseGp(resolved.useGp);
      setGpPercent(String(resolved.gpPercent > 0 ? resolved.gpPercent : 30));
    }
  }

  function handleLocationBlur() {
    const resolved = resolveLocationInput(location, presets);
    if (resolved) {
      setLocation(resolved.location);
      setUseGp(resolved.useGp);
      setGpPercent(String(resolved.gpPercent > 0 ? resolved.gpPercent : 30));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedLocation = normalizeLocationName(location);
    if (!trimmedLocation) {
      setError("ระบุว่าขายที่ไหน");
      return;
    }
    if (qtyNum <= 0) {
      setError("จำนวนต้องมากกว่า 0");
      return;
    }
    if (useGp && (!(gpValue > 0) || gpValue > 100)) {
      setError("GP ต้องอยู่ระหว่าง 0.01–100%");
      return;
    }

    setLoading(true);
    setError("");

    const result = await updateSale(sale.id, {
      product_id: productId,
      quantity: qtyNum,
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
    router.refresh();
    onClose();
  }

  async function handleDelete() {
    if (!confirm("ลบรายการขายนี้? สต็อกจะถูกคืน")) return;
    setDeleting(true);
    setError("");
    const result = await deleteSale(sale.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <AppModal
      open
      onClose={onClose}
      title="แก้ไขรายการขาย"
      subtitle={sale.product?.name ?? "รายการขาย"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="app-label">เมนู</span>
            <select
              className="app-input"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {formatCurrency(product.selling_price)}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="จำนวน"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
            decimals={0}
            allowDecimals={false}
          />

          <div className="sales-quick-form-meta">
            <div className="sales-quick-form-row sales-quick-form-row--meta">
              <label className="sales-quick-form-field sales-quick-form-field--date">
                <span className="app-label">วันที่ขาย</span>
                <input
                  className="app-input sales-quick-form-date"
                  type="date"
                  value={saleDate}
                  max={today}
                  onChange={(event) => setSaleDate(event.target.value)}
                  required
                />
              </label>

              <label className="sales-quick-form-field sales-quick-form-field--location">
                <span className="app-label">ขายที่ไหน</span>
                <input
                  className="app-input"
                  value={location}
                  onChange={(event) => handleLocationChange(event.target.value)}
                  onBlur={handleLocationBlur}
                  list={LOCATION_DATALIST_ID}
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
                      aria-label="หัก GP"
                    />
                    <span>หัก</span>
                  </label>
                  <div className="sales-quick-form-gp-input-wrap">
                    <NumberInput
                      className="sales-quick-form-gp-input"
                      value={gpPercent}
                      onChange={(event) => setGpPercent(event.target.value)}
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
          </div>

          <Input
            label="หมายเหตุ"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="เช่น รอบเช้า, ลูกค้าประจำ"
          />

          {selectedProduct && qtyNum > 0 && (
            <div className="sales-quick-form-estimate">
              <p>
                รายได้สุทธิ:{" "}
                <strong>{formatCurrency(preview.revenue)}</strong>
              </p>
              <p>
                กำไรโดยประมาณ:{" "}
                <strong>{formatCurrency(preview.profit)}</strong>
              </p>
            </div>
          )}

          {error && <p className="sales-quick-form-error">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || deleting}
              className="app-btn app-btn-primary flex-1"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
            <button
              type="button"
              disabled={loading || deleting}
              onClick={handleDelete}
              className="app-btn app-btn-danger"
            >
              {deleting ? "กำลังลบ..." : "ลบ"}
            </button>
          </div>
        </form>
    </AppModal>
  );
}
