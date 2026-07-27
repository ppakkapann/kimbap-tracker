import { FoodCostGauge } from "@/components/products/FoodCostGauge";
import { StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/calculations";
import type { FoodCostStatVariant } from "@/lib/food-cost";

type ProductStatsRowProps = {
  sellingPrice: number;
  profitPerRoll: number;
  costPerRoll: number;
  costStatSub: { text: string; variant: FoodCostStatVariant };
  priceCard: {
    value: string;
    subValue: string;
    variant: FoodCostStatVariant;
    subVariant: FoodCostStatVariant;
  };
  targetMin: number;
  targetMax: number;
};

export function ProductStatsRow({
  sellingPrice,
  profitPerRoll,
  costPerRoll,
  costStatSub,
  priceCard,
  targetMin,
  targetMax,
}: ProductStatsRowProps) {
  const profitVariant = profitPerRoll >= 0 ? "success" : "danger";

  return (
    <div className="product-stats-grid">
      <div className="app-stat product-stat-card">
        <p className="app-stat-label">ราคาขาย</p>
        <p
          className="app-stat-value"
          style={{ color: "var(--accent)" }}
        >
          {formatCurrency(sellingPrice)}
        </p>
        <p
          className="app-stat-subvalue"
          style={{ color: `var(--${profitVariant})` }}
        >
          กำไร/ม้วน {formatCurrency(profitPerRoll)}
        </p>
      </div>

      <StatCard
        className="product-stat-card"
        label="ต้นทุน/ม้วน"
        value={costPerRoll > 0 ? formatCurrency(costPerRoll) : "—"}
        subValue={costStatSub.text}
        subVariant={costStatSub.variant}
      />

      <div className="app-stat product-stat-card">
        <p className="app-stat-label">Food Cost</p>
        <FoodCostGauge
          costPerRoll={costPerRoll}
          sellingPrice={sellingPrice}
          targetMin={targetMin}
          targetMax={targetMax}
        />
      </div>

      <StatCard
        className="product-stat-card"
        label="ราคาแนะนำ"
        value={priceCard.value}
        subValue={priceCard.subValue}
        variant={priceCard.variant}
        subVariant={priceCard.subVariant}
      />
    </div>
  );
}
