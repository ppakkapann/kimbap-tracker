"use client";

import { deleteSale } from "@/lib/actions";
import { formatCurrency } from "@/lib/calculations";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Sale } from "@/lib/types";
import { SaleChannelBadge } from "@/components/sales/SaleChannelBadge";

export function SaleListItem({
  sale,
  profit,
  knownLocations,
}: {
  sale: Sale;
  profit: number;
  knownLocations: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirm("ลบรายการขายนี้? สต็อกจะถูกคืน")) return;
    setLoading(true);
    setError("");
    const result = await deleteSale(sale.id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="sales-list-table-row">
      <div className="sales-list-table-cell sales-list-table-cell--name min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{sale.product?.name}</p>
          <SaleChannelBadge channel={sale.channel} knownLocations={knownLocations} />
        </div>
        {sale.note ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {sale.note}
          </p>
        ) : null}
        {error && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
      <div className="sales-list-table-cell sales-list-table-cell--qty">
        {sale.quantity} ม้วน
      </div>
      <div className="sales-list-table-cell sales-list-table-cell--profit">
        {formatCurrency(profit)}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="sales-list-table-cell sales-list-table-cell--action text-sm transition hover:opacity-70"
        style={{ color: "var(--danger)" }}
      >
        ลบ
      </button>
    </div>
  );
}
