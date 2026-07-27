"use client";

import { useState } from "react";
import { createProduct } from "@/lib/actions";
import { Input } from "@/components/ui";

export function ProductForm({ onSuccess }: { onSuccess?: (id: string) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createProduct({
      name,
      selling_price: parseFloat(price),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setName("");
    setPrice("");
    setLoading(false);
    if ("id" in result && result.id) onSuccess?.(result.id);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="ชื่อเมนู"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="เช่น คิมบับหมู, คิมบับแครอท"
      />
      <Input
        label="ราคาขาย (บาท/ม้วน)"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
        decimals={2}
      />
      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full">
        {loading ? "กำลังบันทึก..." : "เพิ่มเมนู"}
      </button>
    </form>
  );
}
