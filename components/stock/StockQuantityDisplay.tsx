import { formatNumber } from "@/lib/calculations";
import type { Ingredient } from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";

export function StockQuantityDisplay({
  ingredient,
  quantity,
  decimals = 0,
  signed = false,
  className,
}: {
  ingredient: Pick<Ingredient, "unit" | "unit_label">;
  quantity: number;
  decimals?: number;
  signed?: boolean;
  className?: string;
}) {
  const unit = getIngredientUnitLabel(ingredient);
  const prefix = signed && quantity >= 0 ? "+" : "";

  return (
    <span className={className}>
      {prefix}
      {formatNumber(quantity, decimals)}{" "}
      <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
        {unit}
      </span>
    </span>
  );
}
