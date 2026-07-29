import { calculateSaleProfit } from "@/lib/calculations";
import { getIngredientCategoryLabel } from "@/lib/ingredient-categories";
import { filterActualPurchases } from "@/lib/purchases";
import { getSaleChannelLabel, getSaleGpPercent } from "@/lib/sales-channels";
import type {
  Ingredient,
  Product,
  Purchase,
  RecipeItem,
  Sale,
  StockMovement,
  StockMovementReason,
  StockMovementType,
} from "@/lib/types";
import { getIngredientUnitLabel } from "@/lib/types";

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

function withBom(content: string): string {
  return `\uFEFF${content}`;
}

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  purchase: "ซื้อเข้า",
  usage: "ใช้จากขาย",
  waste: "ตัดออก",
  adjustment: "ตรวจนับ",
};

const MOVEMENT_REASON_LABELS: Record<StockMovementReason, string> = {
  spoilage: "ของเสีย / หมดอายุ",
  unsold: "ทำแล้วขายไม่หมด",
  test: "ทดลอง / ชิม / แจก",
  personal: "ใช้ส่วนตัว",
  other: "อื่นๆ",
  count: "ตรวจนับ",
};

function movementReasonLabel(
  type: StockMovementType,
  reason?: StockMovementReason | null
): string {
  if (type === "adjustment") return MOVEMENT_REASON_LABELS.count;
  if (!reason) return "";
  return MOVEMENT_REASON_LABELS[reason] ?? reason;
}

export interface DataExportPayload {
  exportedAt: string;
  sales: SalesExportRow[];
  purchases: PurchaseExportRow[];
  ingredients: IngredientExportRow[];
  movements: MovementExportRow[];
}

export interface SalesExportRow {
  saleDate: string;
  recordedAt: string;
  productName: string;
  quantity: number;
  channel: string;
  gpPercent: number;
  unitPrice: number;
  grossRevenue: number;
  netRevenue: number;
  cost: number;
  profit: number;
  note: string;
  billId: string;
}

export interface PurchaseExportRow {
  purchasedAt: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  grossQuantity: string;
  yieldPercent: string;
  totalPrice: number;
  unitCost: number;
  supplier: string;
  expiresAt: string;
  prepPending: string;
  note: string;
}

export interface IngredientExportRow {
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  lowStockAlert: number;
  avgUnitCost: number;
  stockValue: number;
  priceRefQuantity: string;
  priceRefTotal: string;
  sortOrder: number;
}

export interface MovementExportRow {
  date: string;
  time: string;
  type: string;
  reason: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  unitCost: string;
  note: string;
  referenceId: string;
}

export function buildDataExportPayload(input: {
  sales: Sale[];
  products: Product[];
  recipeItems: RecipeItem[];
  purchases: Purchase[];
  ingredients: Ingredient[];
  movements: StockMovement[];
  exportedAt?: string;
}): DataExportPayload {
  const {
    sales,
    products,
    recipeItems,
    purchases,
    ingredients,
    movements,
    exportedAt = new Date().toISOString(),
  } = input;

  const productMap = new Map(products.map((product) => [product.id, product]));
  const ingredientMap = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient])
  );
  const recipeByProduct = new Map<string, RecipeItem[]>();

  for (const item of recipeItems) {
    const list = recipeByProduct.get(item.product_id) ?? [];
    list.push(item);
    recipeByProduct.set(item.product_id, list);
  }

  const salesRows: SalesExportRow[] = [...sales]
    .sort((a, b) => {
      const dateCompare = b.sale_date.localeCompare(a.sale_date);
      if (dateCompare !== 0) return dateCompare;
      return b.created_at.localeCompare(a.created_at);
    })
    .flatMap((sale) => {
      const product = sale.product ?? productMap.get(sale.product_id);
      if (!product) return [];

      const items = recipeByProduct.get(sale.product_id) ?? [];
      const { revenue, cost, profit, grossRevenue } = calculateSaleProfit(
        sale,
        product,
        items,
        purchases,
        ingredients,
        movements
      );

      return [
        {
          saleDate: sale.sale_date,
          recordedAt: sale.created_at,
          productName: product.name,
          quantity: sale.quantity,
          channel: getSaleChannelLabel(sale.channel),
          gpPercent: getSaleGpPercent(sale),
          unitPrice: product.selling_price,
          grossRevenue,
          netRevenue: revenue,
          cost,
          profit,
          note: sale.note?.trim() ?? "",
          billId: sale.bill_id?.trim() ?? "",
        },
      ];
    });

  const actualPurchases = filterActualPurchases(purchases, movements);
  const purchaseRows: PurchaseExportRow[] = [...actualPurchases]
    .sort((a, b) => b.purchased_at.localeCompare(a.purchased_at))
    .map((purchase) => {
      const ingredient = ingredientMap.get(purchase.ingredient_id);
      const unit = ingredient ? getIngredientUnitLabel(ingredient) : "";
      const yieldPercent =
        purchase.yield_percent != null ? String(purchase.yield_percent) : "";
      const grossQuantity =
        purchase.gross_quantity != null
          ? String(purchase.gross_quantity)
          : String(purchase.quantity);

      return {
        purchasedAt: purchase.purchased_at,
        ingredientName: ingredient?.name ?? purchase.ingredient_id,
        unit,
        quantity: purchase.quantity,
        grossQuantity,
        yieldPercent,
        totalPrice: purchase.total_price,
        unitCost: purchase.unit_cost,
        supplier: purchase.supplier?.trim() ?? "",
        expiresAt: purchase.expires_at ?? "",
        prepPending: purchase.prep_pending ? "ใช่" : "",
        note: purchase.note?.trim() ?? "",
      };
    });

  const ingredientRows: IngredientExportRow[] = [...ingredients]
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "th"))
    .map((ingredient) => ({
      name: ingredient.name,
      category: getIngredientCategoryLabel(ingredient.category),
      unit: getIngredientUnitLabel(ingredient),
      currentStock: ingredient.current_stock,
      lowStockAlert: ingredient.low_stock_alert,
      avgUnitCost: ingredient.avg_unit_cost,
      stockValue: ingredient.current_stock * ingredient.avg_unit_cost,
      priceRefQuantity:
        ingredient.price_ref_quantity != null
          ? String(ingredient.price_ref_quantity)
          : "",
      priceRefTotal:
        ingredient.price_ref_total != null
          ? String(ingredient.price_ref_total)
          : "",
      sortOrder: ingredient.sort_order,
    }));

  const movementRows: MovementExportRow[] = [...movements]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((movement) => {
      const ingredient =
        movement.ingredient ?? ingredientMap.get(movement.ingredient_id);
      const unit = ingredient ? getIngredientUnitLabel(ingredient) : "";

      return {
        date: movement.created_at.slice(0, 10),
        time: movement.created_at.slice(11, 16),
        type: MOVEMENT_TYPE_LABELS[movement.type],
        reason: movementReasonLabel(movement.type, movement.reason),
        ingredientName: ingredient?.name ?? movement.ingredient_id,
        unit,
        quantity: movement.quantity,
        unitCost:
          movement.unit_cost != null ? movement.unit_cost.toFixed(4) : "",
        note: movement.note?.trim() ?? "",
        referenceId: movement.reference_id ?? "",
      };
    });

  return {
    exportedAt,
    sales: salesRows,
    purchases: purchaseRows,
    ingredients: ingredientRows,
    movements: movementRows,
  };
}

export function salesExportToCsv(rows: SalesExportRow[]): string {
  const lines = [
    csvRow([
      "วันที่",
      "เวลาบันทึก",
      "เมนู",
      "จำนวน (ม้วน)",
      "ช่องทาง",
      "GP (%)",
      "ราคาขาย/ม้วน",
      "รายได้ก่อน GP",
      "รายได้หลัง GP",
      "ต้นทุน",
      "กำไร",
      "หมายเหตุ",
      "รหัสบิล",
    ]),
    ...rows.map((row) =>
      csvRow([
        row.saleDate,
        row.recordedAt,
        row.productName,
        row.quantity,
        row.channel,
        row.gpPercent,
        row.unitPrice.toFixed(2),
        row.grossRevenue.toFixed(2),
        row.netRevenue.toFixed(2),
        row.cost.toFixed(2),
        row.profit.toFixed(2),
        row.note,
        row.billId,
      ])
    ),
  ];

  return withBom(lines.join("\n"));
}

export function purchasesExportToCsv(rows: PurchaseExportRow[]): string {
  const lines = [
    csvRow([
      "วันที่ซื้อ",
      "วัตถุดิบ",
      "หน่วย",
      "จำนวนใช้ได้",
      "จำนวนซื้อ",
      "Yield (%)",
      "ราคารวม",
      "ราคา/หน่วย",
      "ซัพพลายเออร์",
      "หมดอายุ",
      "รอเตรียม",
      "หมายเหตุ",
    ]),
    ...rows.map((row) =>
      csvRow([
        row.purchasedAt,
        row.ingredientName,
        row.unit,
        row.quantity,
        row.grossQuantity,
        row.yieldPercent,
        row.totalPrice.toFixed(2),
        row.unitCost.toFixed(4),
        row.supplier,
        row.expiresAt,
        row.prepPending,
        row.note,
      ])
    ),
  ];

  return withBom(lines.join("\n"));
}

export function ingredientsExportToCsv(rows: IngredientExportRow[]): string {
  const lines = [
    csvRow([
      "ชื่อ",
      "ประเภท",
      "หน่วย",
      "สต็อกคงเหลือ",
      "แจ้งเตือนต่ำ",
      "ต้นทุนเฉลี่ย/หน่วย",
      "มูลค่าสต็อก",
      "ปริมาณอ้างอิง",
      "ราคาอ้างอิง",
      "ลำดับ",
    ]),
    ...rows.map((row) =>
      csvRow([
        row.name,
        row.category,
        row.unit,
        row.currentStock,
        row.lowStockAlert,
        row.avgUnitCost.toFixed(4),
        row.stockValue.toFixed(2),
        row.priceRefQuantity,
        row.priceRefTotal,
        row.sortOrder,
      ])
    ),
  ];

  return withBom(lines.join("\n"));
}

export function movementsExportToCsv(rows: MovementExportRow[]): string {
  const lines = [
    csvRow([
      "วันที่",
      "เวลา",
      "ประเภท",
      "เหตุผล",
      "วัตถุดิบ",
      "หน่วย",
      "จำนวน (+/-)",
      "ต้นทุน/หน่วย",
      "หมายเหตุ",
      "อ้างอิง",
    ]),
    ...rows.map((row) =>
      csvRow([
        row.date,
        row.time,
        row.type,
        row.reason,
        row.ingredientName,
        row.unit,
        row.quantity,
        row.unitCost,
        row.note,
        row.referenceId,
      ])
    ),
  ];

  return withBom(lines.join("\n"));
}

export function dataExportFilename(kind: string, exportedAt: string): string {
  const date = exportedAt.slice(0, 10);
  return `kimbap-${kind}-${date}.csv`;
}
