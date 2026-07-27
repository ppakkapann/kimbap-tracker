import Link from "next/link";
import { Badge } from "@/components/ui";
import { PageLoadingSkeleton } from "@/components/ui/PageLoading";
import { formatCurrency } from "@/lib/calculations";
import { fetchProductsWithCost } from "@/lib/queries";

export function ProductsGridSkeleton() {
  return <PageLoadingSkeleton titleWidth="0" stats={0} cards={3} />;
}

export async function ProductsGrid() {
  const products = await fetchProductsWithCost();

  if (products.length === 0) {
    return (
      <div className="app-empty">
        <p className="mb-4">ยังไม่มีเมนู</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/products/${p.id}`}
          className="app-card-interactive block"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{p.name}</p>
                {!p.is_active && <Badge>ปิดขาย</Badge>}
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                ขาย {formatCurrency(p.selling_price)}/ม้วน
              </p>
            </div>
            <div className="text-right text-sm">
              <p style={{ color: "var(--text-muted)" }}>
                ต้นทุน {formatCurrency(p.costPerRoll)}
              </p>
              <p
                className="font-semibold"
                style={{
                  color: p.profitPerRoll >= 0 ? "var(--success)" : "var(--danger)",
                }}
              >
                กำไร {formatCurrency(p.profitPerRoll)}
              </p>
            </div>
          </div>

          {p.recipeItems.length > 0 && (
            <div
              className="mt-3 space-y-1.5 pt-3"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <p
                className="text-[11px] font-medium uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                ต้นทุนแยกรายการ
              </p>
              {p.recipeItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span className="truncate">{item.ingredient?.name || "วัตถุดิบ"}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatCurrency(item.costPerRoll)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
