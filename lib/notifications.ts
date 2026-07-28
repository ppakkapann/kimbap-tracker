import { isLowStock } from "@/lib/calculations";
import {
  calculateFoodCostPercent,
  getFoodCostStatus,
  getProductCostTargets,
} from "@/lib/food-cost";
import { getIngredientUnitLabel } from "@/lib/types";
import type { Ingredient, ProductWithCost, Purchase } from "@/lib/types";
import { formatNumber } from "./calculations";

export type NotificationSeverity = "danger" | "warning" | "info";

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  href: string;
  sortOrder: number;
}

export function buildAppNotifications({
  ingredients,
  purchases,
  productsWithCost,
}: {
  ingredients: Ingredient[];
  purchases: Purchase[];
  productsWithCost: ProductWithCost[];
}): AppNotification[] {
  const notifications: AppNotification[] = [];
  const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));

  for (const ingredient of ingredients) {
    if (ingredient.current_stock > 0) continue;

    notifications.push({
      id: `stock-out-${ingredient.id}`,
      severity: "danger",
      title: `${ingredient.name} หมด`,
      message: "สต็อกเป็น 0 — ควรเติมก่อนขาย",
      href: `/stock?q=${encodeURIComponent(ingredient.name)}`,
      sortOrder: 0,
    });
  }

  for (const purchase of purchases) {
    if (!purchase.prep_pending) continue;
    const ingredient = ingredientMap.get(purchase.ingredient_id);
    notifications.push({
      id: `prep-${purchase.id}`,
      severity: "warning",
      title: `รอเตรียม: ${ingredient?.name ?? "วัตถุดิบ"}`,
      message: "ซื้อเข้าแล้ว ยังไม่ได้บันทึก yield / น้ำหนักใช้ได้",
      href: "/stock?tab=history",
      sortOrder: 5,
    });
  }

  for (const ingredient of ingredients) {
    if (ingredient.current_stock <= 0 || !isLowStock(ingredient)) continue;

    const unit = getIngredientUnitLabel(ingredient);
    notifications.push({
      id: `stock-low-${ingredient.id}`,
      severity: "warning",
      title: `${ingredient.name} ใกล้หมด`,
      message: `เหลือ ${formatNumber(ingredient.current_stock, 1)} ${unit} · แจ้งเตือน < ${formatNumber(ingredient.low_stock_alert, 1)} ${unit}`,
      href: `/stock?q=${encodeURIComponent(ingredient.name)}`,
      sortOrder: 10,
    });
  }

  const activeProducts = productsWithCost.filter((product) => product.is_active);

  for (const product of activeProducts) {
    if (product.costPerRoll > 0) continue;

    notifications.push({
      id: `recipe-${product.id}`,
      severity: "info",
      title: `${product.name} — ยังไม่มีสูตร`,
      message: "กำหนด BOM เพื่อคำนวณต้นทุนและกำไร",
      href: `/products/${product.id}`,
      sortOrder: 20,
    });
  }

  for (const product of activeProducts) {
    if (product.costPerRoll <= 0 || product.selling_price <= 0) continue;

    const targets = getProductCostTargets(product);
    const foodCostPercent = calculateFoodCostPercent(
      product.costPerRoll,
      product.selling_price
    );
    const status = getFoodCostStatus(
      foodCostPercent,
      targets.min,
      targets.max
    );

    if (status !== "high" && status !== "warning") continue;

    notifications.push({
      id: `food-cost-${product.id}`,
      severity: status === "high" ? "warning" : "info",
      title: `${product.name} — ต้นทุนสูง`,
      message: `Food cost ${foodCostPercent.toFixed(1)}% · เป้าไม่เกิน ${targets.max}%`,
      href: `/products/${product.id}`,
      sortOrder: status === "high" ? 15 : 25,
    });
  }

  return notifications.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "th")
  );
}

export function countCriticalNotifications(
  notifications: AppNotification[]
): number {
  return notifications.filter((item) => item.severity === "danger").length;
}
