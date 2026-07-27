"use client";

import { Fragment, useMemo, useState } from "react";
import { deleteSale } from "@/lib/actions";
import {
  calculateSaleRevenue,
  formatCurrency,
  formatNumber,
} from "@/lib/calculations";
import type { ProductWithCost, Sale } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SaleChannelBadge } from "@/components/sales/SaleChannelBadge";
import { SaleEditModal } from "@/components/sales/SaleEditModal";
import type { SaleLocationPreset } from "@/lib/sale-location-presets";

type SaleRow = {
  sale: Sale;
  profit: number;
};

export function SalesBillList({
  rows,
  products,
  knownLocations,
  savedLocationPresets = [],
}: {
  rows: SaleRow[];
  products: ProductWithCost[];
  knownLocations: string[];
  savedLocationPresets?: SaleLocationPreset[];
}) {
  const router = useRouter();
  const [editingRow, setEditingRow] = useState<SaleRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const groupedRows = useMemo(() => {
    const groups = new Map<string, SaleRow[]>();
    for (const row of rows) {
      const billKey = row.sale.bill_id || row.sale.id;
      const existing = groups.get(billKey) ?? [];
      existing.push(row);
      groups.set(billKey, existing);
    }
    return [...groups.values()];
  }, [rows]);

  const totals = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    let rolls = 0;
    for (const row of rows) {
      revenue += calculateSaleRevenue(
        row.sale,
        row.sale.product?.selling_price ?? 0
      );
      profit += row.profit;
      rolls += row.sale.quantity;
    }
    return { revenue, profit, rolls, count: rows.length };
  }, [rows]);

  async function handleDelete(id: string) {
    if (!confirm("ลบรายการขายนี้? สต็อกจะถูกคืน")) return;
    setDeletingId(id);
    setError("");
    const result = await deleteSale(id);
    if (result.error) {
      setError(result.error);
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
    router.refresh();
  }

  return (
    <>
      <div className="sales-list-table-shell">
        {error && <p className="sales-list-table-error">{error}</p>}

        <div className="app-table-wrap sales-list-table-scroll">
          <table className="app-table app-table-compact sales-list-table">
            <colgroup>
              <col className="sales-list-col-name" />
              <col className="sales-list-col-qty" />
              <col className="sales-list-col-channel" />
              <col className="sales-list-col-revenue" />
              <col className="sales-list-col-profit" />
              <col className="sales-list-col-action" />
            </colgroup>
            <thead>
              <tr>
                <th className="sales-list-col-name">เมนู</th>
                <th className="sales-list-col-qty cell-right">จำนวน</th>
                <th className="sales-list-col-channel">ขาย</th>
                <th className="sales-list-col-revenue cell-right">รายได้</th>
                <th className="sales-list-col-profit cell-right">กำไร</th>
                <th className="sales-list-col-action" aria-label="จัดการ" />
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) => {
                const isBill =
                  group.length > 1 || Boolean(group[0]?.sale.bill_id);
                const billRolls = group.reduce(
                  (sum, row) => sum + row.sale.quantity,
                  0
                );
                const groupKey = group[0]?.sale.bill_id ?? group[0]?.sale.id;

                return (
                  <Fragment key={groupKey}>
                    {isBill && (
                      <tr className="sales-bill-row">
                        <td colSpan={6}>
                          สรุปบิล · {formatNumber(billRolls, 0)} ม้วน
                        </td>
                      </tr>
                    )}
                    {group.map(({ sale, profit }) => {
                      const revenue = calculateSaleRevenue(
                        sale,
                        sale.product?.selling_price ?? 0
                      );
                      return (
                        <tr
                          key={sale.id}
                          className="sales-list-row"
                          tabIndex={0}
                          onClick={() => setEditingRow({ sale, profit })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setEditingRow({ sale, profit });
                            }
                          }}
                        >
                          <td className="sales-list-col-name">
                            <div className="sales-list-name-cell">
                              <p className="sales-list-name">
                                {sale.product?.name ?? "ไม่พบเมนู"}
                              </p>
                              {sale.note ? (
                                <p className="sales-list-note">{sale.note}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="cell-right cell-numeric sales-list-col-qty">
                            {sale.quantity}
                          </td>
                          <td className="sales-list-col-channel">
                            <SaleChannelBadge
                              channel={sale.channel}
                              knownLocations={knownLocations}
                            />
                          </td>
                          <td className="cell-right cell-numeric sales-list-col-revenue">
                            {formatCurrency(revenue)}
                          </td>
                          <td className="cell-right cell-numeric sales-list-col-profit sales-list-profit-value">
                            {formatCurrency(profit)}
                          </td>
                          <td className="sales-list-col-action">
                            <button
                              type="button"
                              aria-label={`ลบรายการขาย ${sale.product?.name ?? ""}`}
                              className="sales-list-delete-btn"
                              disabled={deletingId === sale.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(sale.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="sales-list-table-footer">
          <p className="app-table-footer-label sales-list-footer-label">
            รวม {totals.count} รายการ · {totals.rolls} ม้วน
          </p>
          <span className="sales-list-footer-spacer" aria-hidden="true" />
          <span className="sales-list-footer-spacer" aria-hidden="true" />
          <p className="app-table-footer-value sales-list-footer-revenue">
            {formatCurrency(totals.revenue)}
          </p>
          <p className="app-table-footer-value sales-list-footer-profit sales-list-profit-value">
            {formatCurrency(totals.profit)}
          </p>
          <span className="sales-list-footer-spacer" aria-hidden="true" />
        </div>
      </div>

      {editingRow && (
        <SaleEditModal
          sale={editingRow.sale}
          products={products}
          savedLocationPresets={savedLocationPresets}
          onClose={() => setEditingRow(null)}
        />
      )}
    </>
  );
}
