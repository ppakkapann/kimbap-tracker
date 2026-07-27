import {
  normalizeStorageUnit,
  type BaseUnit,
} from "@/lib/unit-conversion";

export type { BaseUnit };

export type IngredientUnit = "g" | "kg" | "piece" | "bunch" | "ml" | "l";
export type StockMovementType = "purchase" | "usage" | "waste" | "adjustment";
export type StockMovementReason =
  | "spoilage"
  | "unsold"
  | "test"
  | "personal"
  | "other"
  | "count";

import type { SaleChannel } from "@/lib/sales-channels";
import type { IngredientCategory } from "@/lib/ingredient-categories";

export type { SaleChannel };
export type { IngredientCategory };

export interface Ingredient {
  id: string;
  user_id: string;
  name: string;
  unit: IngredientUnit;
  unit_label: string | null;
  category?: IngredientCategory | null;
  current_stock: number;
  avg_unit_cost: number;
  /** ปริมาณอ้างอิงสำหรับคิดราคา/หน่วย (ไม่ใช่การซื้อจริง) */
  price_ref_quantity?: number | null;
  /** ราคาอ้างอิงของ price_ref_quantity */
  price_ref_total?: number | null;
  /** สัดส่วนใช้ได้จริงหลังเตรียม 1–100%; ค่าเริ่มต้น 100% */
  price_ref_yield_percent?: number | null;
  low_stock_alert: number;
  sort_order: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  ingredient_id: string;
  user_id: string;
  supplier?: string | null;
  expires_at?: string | null;
  /** ปริมาณพร้อมใช้ที่เพิ่มเข้าสต็อก หลังหัก Yield */
  quantity: number;
  /** ปริมาณก่อนตัดแต่ง/ปรุง; รายการเก่าอาจไม่มีค่า */
  gross_quantity?: number | null;
  /** สัดส่วนที่ใช้ได้จริง 1–100%; รายการเก่าเท่ากับ 100% */
  yield_percent?: number | null;
  total_price: number;
  /** ต้นทุนต่อหน่วยพร้อมใช้ หลังคิด Yield */
  unit_cost: number;
  /** ต้นทุนต่อหน่วยก่อนคิด Yield */
  gross_unit_cost?: number | null;
  /** ซื้อแล้วยังไม่เตรียม — ต้นทุนชั่วคราวจนกว่าจะบันทึกหลังเตรียม */
  prep_pending?: boolean;
  purchased_at: string;
  note: string | null;
  created_at: string;
}

export interface OperatingExpense {
  id: string;
  user_id: string;
  expense_date: string;
  category: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  selling_price: number;
  target_cost_min_percent?: number | null;
  target_cost_max_percent?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface RecipeItem {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity_per_roll: number;
  /** ปริมาณที่ใช้ต่อรอบเตรียม (เช่น 300 กรัม) */
  batch_quantity?: number | null;
  /** จำนวนแถวที่ทำได้จาก batch_quantity (เช่น 2 แถว) */
  batch_yield?: number | null;
  ingredient?: Ingredient;
}


export interface Sale {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  sale_date: string;
  channel: string;
  /** รวมหลายเมนูในบิลเดียว */
  bill_id?: string | null;
  /** GP หักจากแพลตฟอร์ม 0–100%; 0 = ขายหน้าร้าน */
  gp_percent?: number;
  note: string | null;
  created_at: string;
  product?: Product;
}

export interface StockMovement {
  id: string;
  ingredient_id: string;
  user_id: string;
  type: StockMovementType;
  quantity: number;
  unit_cost: number | null;
  reference_id: string | null;
  reason?: StockMovementReason | null;
  note: string | null;
  created_at: string;
  ingredient?: Ingredient;
}

export interface ProductWithCost extends Product {
  costPerRoll: number;
  profitPerRoll: number;
  recipeItems: RecipeItemWithCost[];
}

export interface RecipeItemWithCost extends RecipeItem {
  costPerRoll: number;
  unitCost: number;
}

export interface DailySummary {
  totalRolls: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

export interface IngredientAccounting {
  ingredientId: string;
  name: string;
  unitLabel: string;
  currentStock: number;
  avgUnitCost: number;
  latestUnitCost: number;
  totalPurchased: number;
  totalUsed: number;
  totalWaste: number;
  stockValue: number;
}

export interface AccountingPeriodSummary {
  month: string;
  totalPurchased: number;
  totalUsed: number;
  totalWaste: number;
  stockValue: number;
  totalRevenue: number;
  totalProfit: number;
  totalOperatingExpenses: number;
  estimatedNetProfit: number;
  grossMargin: number;
  totalRolls: number;
  foodCostPercent: number;
  wastePercent: number;
  laborExpenses: number;
  primeCostPercent: number;
  averageRevenuePerRoll: number;
  breakEvenReached: boolean;
}

export const UNIT_LABELS: Record<IngredientUnit, string> = {
  g: "กรัม",
  kg: "กิโลกรัม",
  piece: "ชิ้น",
  bunch: "กำ",
  ml: "มล.",
  l: "ลิตร",
};

export function getIngredientBaseUnit(
  ingredient: Pick<Ingredient, "unit">
): BaseUnit {
  return normalizeStorageUnit(ingredient.unit);
}

export function getIngredientUnitLabel(
  ingredient: Pick<Ingredient, "unit" | "unit_label">
): string {
  const custom = ingredient.unit_label?.trim();
  if (custom) return custom;
  return UNIT_LABELS[getIngredientBaseUnit(ingredient)];
}

export function getIngredientBaseUnitLabel(
  ingredient: Pick<Ingredient, "unit" | "unit_label">
): string {
  return getIngredientUnitLabel(ingredient);
}
