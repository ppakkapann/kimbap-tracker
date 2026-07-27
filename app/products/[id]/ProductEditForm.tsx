"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct, deleteProduct } from "@/lib/actions";
import { Button, Input } from "@/components/ui";
import { getProductCostTargets } from "@/lib/food-cost";
import { parseFormattedNumber } from "@/lib/calculations";
import type { Product } from "@/lib/types";

export function ProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const targets = getProductCostTargets(product);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.selling_price));
  const [targetMin, setTargetMin] = useState(String(targets.min));
  const [targetMax, setTargetMax] = useState(String(targets.max));
  const [isActive, setIsActive] = useState(product.is_active);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const min = parseFormattedNumber(targetMin) ?? 0;
    const max = parseFormattedNumber(targetMax) ?? 0;
    if (!(min > 0) || max > 100 || min > max) {
      setError("กำหนดช่วงต้นทุนเป้าหมายให้ถูกต้อง");
      return;
    }

    setLoading(true);
    setError("");

    const result = await updateProduct(product.id, {
      name,
      selling_price: parseFormattedNumber(price) ?? 0,
      target_cost_min_percent: min,
      target_cost_max_percent: max,
      is_active: isActive,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("ลบเมนูนี้?")) return;
    setLoading(true);
    setError("");
    const result = await deleteProduct(product.id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="product-menu-form">
      <Input label="ชื่อเมนู" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        label="ราคาขาย (บาท)"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
        decimals={2}
      />

      <fieldset className="product-target-row">
        <legend className="app-label">เป้า Food Cost (%)</legend>
        <div className="product-target-fields">
          <Input
            label="ต่ำสุด"
            type="number"
            value={targetMin}
            onChange={(e) => setTargetMin(e.target.value)}
            required
            decimals={2}
          />
          <Input
            label="สูงสุด"
            type="number"
            value={targetMax}
            onChange={(e) => setTargetMax(e.target.value)}
            required
            decimals={2}
          />
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded"
        />
        เปิดขาย
      </label>
      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2 product-menu-form-actions">
        <Button type="submit" disabled={loading} className="flex-1">
          บันทึก
        </Button>
        <Button type="button" variant="danger" onClick={handleDelete}>
          ลบ
        </Button>
      </div>
    </form>
  );
}
