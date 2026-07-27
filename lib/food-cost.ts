export const DEFAULT_TARGET_COST_MIN = 30;
export const DEFAULT_TARGET_COST_MAX = 35;

export type FoodCostStatus = "empty" | "below" | "target" | "warning" | "high";

export function getProductCostTargets(product: {
  target_cost_min_percent?: number | null;
  target_cost_max_percent?: number | null;
}): { min: number; max: number } {
  return {
    min: product.target_cost_min_percent ?? DEFAULT_TARGET_COST_MIN,
    max: product.target_cost_max_percent ?? DEFAULT_TARGET_COST_MAX,
  };
}

export function calculateFoodCostPercent(
  costPerUnit: number,
  sellingPrice: number
): number {
  if (costPerUnit <= 0 || sellingPrice <= 0) return 0;
  return (costPerUnit / sellingPrice) * 100;
}

export function getFoodCostStatus(
  percent: number,
  targetMin: number,
  targetMax: number
): FoodCostStatus {
  if (percent <= 0) return "empty";
  if (percent < targetMin) return "below";
  if (percent <= targetMax) return "target";
  if (percent <= targetMax + 5) return "warning";
  return "high";
}

export function suggestedSellingPriceRange(
  costPerUnit: number,
  targetMin: number,
  targetMax: number
): { min: number; max: number } {
  if (costPerUnit <= 0 || targetMin <= 0 || targetMax <= 0) {
    return { min: 0, max: 0 };
  }
  return {
    min: Math.ceil(costPerUnit / (targetMax / 100)),
    max: Math.ceil(costPerUnit / (targetMin / 100)),
  };
}

export function getFoodCostStatusLabel(status: FoodCostStatus): string {
  return {
    empty: "—",
    below: "มาร์จิ้นสูง",
    target: "ตามเป้าหมาย",
    warning: "สูงกว่าเป้า",
    high: "สูงเกินเป้า",
  }[status];
}

export function getFoodCostStatSubLabel(
  costPerRoll: number,
  sellingPrice: number,
  status: FoodCostStatus
): string {
  if (costPerRoll <= 0) return "ยังไม่มีสูตร";
  if (sellingPrice <= 0) return "กรอกราคาขาย";
  return getFoodCostStatusLabel(status);
}

export function getFoodCostStatusVariant(
  status: FoodCostStatus
): "default" | "accent" | "success" | "warning" | "danger" {
  const variants = {
    empty: "default",
    below: "accent",
    target: "success",
    warning: "warning",
    high: "danger",
  } as const;
  return variants[status];
}

export function getFoodCostStatusColor(status: FoodCostStatus): string {
  const colors = {
    empty: "var(--text-muted)",
    below: "var(--accent)",
    target: "var(--success)",
    warning: "var(--warning)",
    high: "var(--danger)",
  } as const;
  return colors[status];
}

export function getFoodCostGaugeMaxScale(
  percent: number,
  targetMax: number
): number {
  return Math.max(50, targetMax + 15, Math.ceil(percent / 5) * 5 + 5);
}

export type FoodCostStatVariant = ReturnType<typeof getFoodCostStatusVariant>;

function getFoodCostAdviceShort(
  status: FoodCostStatus,
  targetMin: number,
  targetMax: number,
  sellingPrice: number,
  suggestedMin: number
): string {
  if (status === "target") return "อยู่ในเป้า";
  if (status === "below") return `ต่ำกว่าเป้า ${targetMin}% มาร์จิ้นดี`;
  if (sellingPrice > 0 && sellingPrice < suggestedMin) {
    return `สูงกว่าเป้า ${targetMax}% ควรขึ้นราคา`;
  }
  if (status === "warning") {
    return `สูงกว่าเป้า ${targetMax}% ขึ้นราคาหรือลดสูตร`;
  }
  return `สูงเกินเป้า ${targetMax}% ควรปรับราคา/สูตร`;
}

/** คำแนะนำสั้นใต้การ์ด Food Cost */
export function getFoodCostAdvice(
  costPerRoll: number,
  sellingPrice: number,
  targetMin: number,
  targetMax: number
): string {
  if (costPerRoll <= 0) return "ยังไม่มีสูตร";
  if (sellingPrice <= 0) return "กรอกราคาขายเพื่อดู Food Cost";

  const percent = calculateFoodCostPercent(costPerRoll, sellingPrice);
  const status = getFoodCostStatus(percent, targetMin, targetMax);
  const suggested = suggestedSellingPriceRange(
    costPerRoll,
    targetMin,
    targetMax
  );

  return getFoodCostAdviceShort(
    status,
    targetMin,
    targetMax,
    sellingPrice,
    suggested.min
  );
}

/** คำแนะนำใต้การ์ด ต้นทุน/ม้วน */
export function getCostStatCardSub(
  costPerRoll: number,
  sellingPrice: number,
  targetMin: number,
  targetMax: number
): { text: string; variant: FoodCostStatVariant } {
  const text = getFoodCostAdvice(
    costPerRoll,
    sellingPrice,
    targetMin,
    targetMax
  );

  if (costPerRoll <= 0 || sellingPrice <= 0) {
    return { text, variant: "default" };
  }

  const percent = calculateFoodCostPercent(costPerRoll, sellingPrice);
  const status = getFoodCostStatus(percent, targetMin, targetMax);

  return {
    text,
    variant: getFoodCostStatusVariant(status),
  };
}

/** subValue ใต้การ์ด ต้นทุน/ม้วน */
export function getCostCardFoodCostSub(
  costPerRoll: number,
  sellingPrice: number,
  targetMin: number,
  targetMax: number
): { text: string; variant: FoodCostStatVariant } {
  if (costPerRoll <= 0) {
    return { text: "ยังไม่มีสูตร", variant: "default" };
  }
  if (sellingPrice <= 0) {
    return { text: "กรอกราคาขายเพื่อดู Food Cost", variant: "default" };
  }

  const percent = calculateFoodCostPercent(costPerRoll, sellingPrice);
  const status = getFoodCostStatus(percent, targetMin, targetMax);
  const suggested = suggestedSellingPriceRange(
    costPerRoll,
    targetMin,
    targetMax
  );
  const advice = getFoodCostAdviceShort(
    status,
    targetMin,
    targetMax,
    sellingPrice,
    suggested.min
  );

  return {
    text: `Food Cost ${percent.toFixed(1)}% · ${advice}`,
    variant: getFoodCostStatusVariant(status),
  };
}

/** การ์ด ราคาแนะนำ (เดิม Food Cost) */
export function getSuggestedPriceCard(
  costPerRoll: number,
  sellingPrice: number,
  targetMin: number,
  targetMax: number
): {
  value: string;
  subValue: string;
  variant: FoodCostStatVariant;
  subVariant: FoodCostStatVariant;
} {
  const targetLabel = `เป้า ${targetMin}–${targetMax}%`;

  if (costPerRoll <= 0) {
    return {
      value: "—",
      subValue: "ยังไม่มีสูตร",
      variant: "default",
      subVariant: "default",
    };
  }

  const suggested = suggestedSellingPriceRange(
    costPerRoll,
    targetMin,
    targetMax
  );
  const value = `฿${suggested.min}–฿${suggested.max}`;

  if (sellingPrice <= 0) {
    return {
      value,
      subValue: `${targetLabel} · กรอกราคาขายเพื่อเปรียบเทียบ`,
      variant: "accent",
      subVariant: "default",
    };
  }

  const percent = calculateFoodCostPercent(costPerRoll, sellingPrice);
  const status = getFoodCostStatus(percent, targetMin, targetMax);

  if (status === "target") {
    return {
      value,
      subValue: `${targetLabel} · ราคา ${Math.round(sellingPrice)} บาท เหมาะสม`,
      variant: "success",
      subVariant: "success",
    };
  }

  if (status === "below") {
    return {
      value,
      subValue: `${targetLabel} · ราคาสูงกว่าช่วง มาร์จิ้นดี`,
      variant: "accent",
      subVariant: "success",
    };
  }

  if (sellingPrice < suggested.min) {
    return {
      value,
      subValue: `${targetLabel} · จากราคา ${Math.round(sellingPrice)} บาท ควร ≥ ฿${suggested.min}`,
      variant: "warning",
      subVariant: "warning",
    };
  }

  return {
    value,
    subValue: `${targetLabel} · ควรขึ้นเป็น ฿${suggested.min} หรือลดสูตร`,
    variant: "danger",
    subVariant: "danger",
  };
}
