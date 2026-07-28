"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { deletePurchase, updatePurchase } from "@/lib/actions";
import { formatCurrency, formatNumber } from "@/lib/calculations";
import { purchaseHasYield } from "@/lib/purchase-yield";
import type { Ingredient, Purchase } from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";
import { DatePicker, Input, NumberInput, AppModal } from "@/components/ui";

export function PurchaseEditModal({
  purchase,
  ingredient,
  onClose,
}: {
  purchase: Purchase;
  ingredient: Ingredient;
  onClose: () => void;
}) {
  const router = useRouter();
  const unit = getIngredientUnitLabel(ingredient);
  const today = format(new Date(), "yyyy-MM-dd");

  const [quantity, setQuantity] = useState(String(purchase.quantity));
  const [totalPrice, setTotalPrice] = useState(String(purchase.total_price));
  const [purchasedAt, setPurchasedAt] = useState(purchase.purchased_at);
  const [note, setNote] = useState(purchase.note ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const qtyNum = parseFloat(quantity);
  const priceNum = parseFloat(totalPrice);

  const preview = useMemo(() => {
    if (!(qtyNum > 0) || !(priceNum >= 0)) {
      return { unitCost: 0, stockDelta: 0 };
    }
    const stockDelta = qtyNum - purchase.quantity;
    return {
      unitCost: priceNum / qtyNum,
      stockDelta,
    };
  }, [qtyNum, priceNum, purchase.quantity]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await updatePurchase(purchase.id, {
      quantity: qtyNum,
      total_price: priceNum,
      purchased_at: purchasedAt,
      note: note || undefined,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  async function handleDelete() {
    if (!confirm("ลบรายการซื้อนี้? สต็อกจะลดตามจำนวนที่ซื้อ")) return;

    setDeleting(true);
    setError("");
    const result = await deletePurchase(purchase.id);
    setDeleting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  const hasYield = purchaseHasYield(purchase);

  return (
    <AppModal
      open
      onClose={onClose}
      title="แก้ไขการซื้อ"
      subtitle={`${ingredient.name}${hasYield ? " · มี Yield" : ""}${purchase.prep_pending ? " · รอเตรียม" : ""}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="app-label">จำนวนใช้ได้ ({unit})</span>
            <NumberInput
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
              allowDecimals
              decimals={2}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="app-label">ราคารวม (฿)</span>
            <NumberInput
              value={totalPrice}
              onChange={(event) => setTotalPrice(event.target.value)}
              required
              allowDecimals
              decimals={2}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="app-label">วันที่ซื้อ</span>
            <DatePicker value={purchasedAt} onChange={setPurchasedAt} max={today} />
          </label>

          <Input
            label="หมายเหตุ"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="เช่น ตลาด, โลตัส"
          />

          {qtyNum > 0 && priceNum >= 0 && (
            <div className="stock-count-preview">
              <div>
                <span>ต้นทุน/หน่วย</span>
                <strong>{formatCurrency(preview.unitCost)}/{unit}</strong>
              </div>
              {preview.stockDelta !== 0 && (
                <div>
                  <span>สต็อกเปลี่ยน</span>
                  <strong
                    style={{
                      color:
                        preview.stockDelta > 0
                          ? "var(--success)"
                          : "var(--danger)",
                    }}
                  >
                    {preview.stockDelta > 0 ? "+" : ""}
                    {formatNumber(preview.stockDelta, 1)} {unit}
                  </strong>
                </div>
              )}
            </div>
          )}

          {error && (
            <p
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                color: "var(--danger)",
                background: "var(--danger-muted)",
              }}
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || deleting}
              className="app-btn app-btn-primary"
            >
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading || deleting}
              className="app-btn app-btn-secondary"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="app-btn app-btn-danger ml-auto"
            >
              {deleting ? "กำลังลบ..." : "ลบ"}
            </button>
          </div>
        </form>
    </AppModal>
  );
}
