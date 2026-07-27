import { formatNumber } from "@/lib/calculations";
import type { IngredientUnit } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/types";

export type BaseUnit = "g" | "ml" | "piece";
export type UnitFamily = "mass" | "volume" | "count";

const UNIT_TO_FAMILY: Record<IngredientUnit, UnitFamily> = {
  g: "mass",
  kg: "mass",
  ml: "volume",
  l: "volume",
  piece: "count",
  bunch: "count",
};

const BASE_BY_FAMILY: Record<UnitFamily, BaseUnit> = {
  mass: "g",
  volume: "ml",
  count: "piece",
};

/** Multiply quantity in `fromUnit` to get quantity in base unit */
const TO_BASE_FACTOR: Record<IngredientUnit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  piece: 1,
  bunch: 1,
};

export function getUnitFamily(unit: IngredientUnit): UnitFamily {
  return UNIT_TO_FAMILY[unit];
}

export function getBaseUnit(unit: IngredientUnit): BaseUnit {
  return BASE_BY_FAMILY[getUnitFamily(unit)];
}

export function toBaseUnit(unit: IngredientUnit): BaseUnit {
  return getBaseUnit(unit);
}

export function areUnitsCompatible(a: IngredientUnit, b: IngredientUnit): boolean {
  return getUnitFamily(a) === getUnitFamily(b);
}

export function convertQuantity(
  quantity: number,
  fromUnit: IngredientUnit,
  toUnit: IngredientUnit
): number {
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    throw new Error(`Incompatible units: ${fromUnit} → ${toUnit}`);
  }
  const inBase = quantity * TO_BASE_FACTOR[fromUnit];
  return inBase / TO_BASE_FACTOR[toUnit];
}

export function convertToBase(
  quantity: number,
  fromUnit: IngredientUnit
): number {
  return quantity * TO_BASE_FACTOR[fromUnit];
}

export function convertFromBase(
  quantity: number,
  toUnit: IngredientUnit
): number {
  const factor = TO_BASE_FACTOR[toUnit];
  if (factor === 0) return quantity;
  return quantity / factor;
}

export function normalizeIngredientUnit(unit: IngredientUnit): BaseUnit {
  return toBaseUnit(unit);
}

export function normalizePurchaseQuantity(
  quantity: number,
  purchaseUnit: IngredientUnit,
  ingredientUnit: IngredientUnit
): number {
  return convertQuantity(quantity, purchaseUnit, toBaseUnit(ingredientUnit));
}

export function scaleUnitCostForUnitChange(
  unitCost: number,
  oldUnit: IngredientUnit,
  newUnit: IngredientUnit
): number {
  if (unitCost <= 0) return unitCost;
  const qtyInNew = convertQuantity(1, oldUnit, newUnit);
  return unitCost / qtyInNew;
}

export function purchasableUnitsFor(family: UnitFamily): IngredientUnit[] {
  switch (family) {
    case "mass":
      return ["g", "kg"];
    case "volume":
      return ["ml", "l"];
    case "count":
      return ["piece"];
  }
}

export function isStorageBaseUnit(unit: IngredientUnit): boolean {
  return unit === "g" || unit === "ml" || unit === "piece";
}

export function getBaseUnitLabel(unit: BaseUnit): string {
  return UNIT_LABELS[unit];
}

export function formatQuantityWithHint(
  quantity: number,
  baseUnit: BaseUnit,
  options?: { decimals?: number; customLabel?: string | null }
): { primary: string; hint: string | null } {
  const decimals = options?.decimals ?? (Number.isInteger(quantity) ? 0 : 2);
  const label = options?.customLabel?.trim() || getBaseUnitLabel(baseUnit);
  const primary = `${formatNumber(quantity, decimals)} ${label}`;

  let hint: string | null = null;
  if (baseUnit === "g" && quantity >= 1000) {
    hint = `${formatNumber(convertFromBase(quantity, "kg"), 2)} ${UNIT_LABELS.kg}`;
  } else if (baseUnit === "ml" && quantity >= 1000) {
    hint = `${formatNumber(convertFromBase(quantity, "l"), 2)} ${UNIT_LABELS.l}`;
  }

  return { primary, hint };
}

export function formatQuantityWithHintText(
  quantity: number,
  baseUnit: BaseUnit,
  options?: { decimals?: number; customLabel?: string | null }
): string {
  const { primary, hint } = formatQuantityWithHint(quantity, baseUnit, options);
  return hint ? `${primary} (${hint})` : primary;
}

export function normalizeStorageUnit(unit: IngredientUnit): BaseUnit {
  return toBaseUnit(unit);
}

export function scaleIngredientQuantities(
  quantities: {
    current_stock: number;
    low_stock_alert: number;
    price_ref_quantity: number | null | undefined;
    avg_unit_cost: number;
    quantity_per_roll?: number;
    batch_quantity?: number | null;
  },
  oldUnit: IngredientUnit,
  newUnit: IngredientUnit
) {
  if (oldUnit === newUnit) return quantities;
  const factor = convertQuantity(1, oldUnit, newUnit);
  return {
    current_stock: quantities.current_stock * factor,
    low_stock_alert: quantities.low_stock_alert * factor,
    price_ref_quantity:
      quantities.price_ref_quantity != null
        ? quantities.price_ref_quantity * factor
        : quantities.price_ref_quantity,
    avg_unit_cost: scaleUnitCostForUnitChange(
      quantities.avg_unit_cost,
      oldUnit,
      newUnit
    ),
    quantity_per_roll:
      quantities.quantity_per_roll != null
        ? quantities.quantity_per_roll * factor
        : quantities.quantity_per_roll,
    batch_quantity:
      quantities.batch_quantity != null
        ? quantities.batch_quantity * factor
        : quantities.batch_quantity,
  };
}
