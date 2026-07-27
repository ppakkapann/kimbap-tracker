import { computeWeightedAvgCost } from "./accounting";
import type { SalesPlatform } from "./sales-channels";
import { getGpPercentForChannel } from "./sales-channels";
import type {
  Ingredient,
  Product,
  ProductWithCost,
  Purchase,
  RecipeItem,
  Sale,
  StockMovement,
  StockMovementReason,
  OperatingExpense,
} from "./types";

const USER = "demo-user";
const PRODUCT_ID = "prod-kimbap";

const DEMO_PLATFORM_CYCLE: SalesPlatform[] = [
  "storefront",
  "grab",
  "lineman",
  "storefront",
];

function demoSaleChannel(id: string): SalesPlatform {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return DEMO_PLATFORM_CYCLE[n % DEMO_PLATFORM_CYCLE.length];
}

/** bump เมื่อเปลี่ยนชุดข้อมูล demo — บังคับ reseed store ใน memory */
export const DEMO_DATA_VERSION = 17;

const DEMO_INGREDIENT_DEFS = [
  {
    id: "ing-rice",
    name: "ข้าวญี่ปุ่น",
    unit: "g" as const,
    unit_label: null,
    category: "food" as const,
    low: 500,
    sort: 0,
    priceRefQty: 5000,
    priceRefTotal: 245,
  },
  {
    id: "ing-carrot",
    name: "แครอท",
    unit: "g" as const,
    unit_label: null,
    category: "food" as const,
    low: 100,
    sort: 1,
    priceRefQty: 300,
    priceRefTotal: 27,
    priceRefYieldPercent: 85,
  },
  {
    id: "ing-pork",
    name: "หมูสันคอ",
    unit: "g" as const,
    unit_label: null,
    category: "food" as const,
    low: 200,
    sort: 2,
    priceRefQty: 600,
    priceRefTotal: 83,
  },
  {
    id: "ing-egg",
    name: "ไข่",
    unit: "piece" as const,
    unit_label: "ฟอง",
    category: "food" as const,
    low: 15,
    sort: 3,
    priceRefQty: 10,
    priceRefTotal: 40,
  },
  {
    id: "ing-seaweed",
    name: "สาหร่าย",
    unit: "piece" as const,
    unit_label: "แผ่น",
    category: "food" as const,
    low: 12,
    sort: 4,
    priceRefQty: 10,
    priceRefTotal: 85,
  },
  {
    id: "ing-oil",
    name: "โกชูจังน้ำมันงา",
    unit: "ml" as const,
    unit_label: null,
    category: "food" as const,
    low: 100,
    sort: 5,
    priceRefQty: 500,
    priceRefTotal: 273,
  },
  {
    id: "ing-box",
    name: "กล่องกินซิง",
    unit: "piece" as const,
    unit_label: "ใบ",
    category: "packaging" as const,
    low: 50,
    sort: 6,
    priceRefQty: 100,
    priceRefTotal: 350,
  },
  {
    id: "ing-chopsticks",
    name: "ตะเกียบ",
    unit: "piece" as const,
    unit_label: "คู่",
    category: "packaging" as const,
    low: 50,
    sort: 7,
    priceRefQty: 100,
    priceRefTotal: 80,
  },
  {
    id: "ing-bag",
    name: "ถุงใส่",
    unit: "piece" as const,
    unit_label: "ใบ",
    category: "packaging" as const,
    low: 50,
    sort: 8,
    priceRefQty: 200,
    priceRefTotal: 120,
  },
] as const;

const RECIPE_PER_ROLL: Record<string, number> = {
  "ing-rice": 45.45,
  "ing-carrot": 75,
  "ing-pork": 100,
  "ing-egg": 1,
  "ing-seaweed": 1,
  "ing-oil": 5,
  "ing-box": 1,
  "ing-chopsticks": 1,
  "ing-bag": 1,
};

type PurchaseRow = {
  id: string;
  ingredientId: string;
  date: string;
  quantity: number;
  totalPrice: number;
  note: string | null;
  time: string;
};

type SaleRow = {
  id: string;
  date: string;
  quantity: number;
  note: string | null;
  time: string;
};

type WasteRow = {
  id: string;
  ingredientId: string;
  date: string;
  quantity: number;
  reason: StockMovementReason;
  note: string;
  time: string;
  referenceId?: string | null;
};

type ProductWasteRow = {
  id: string;
  date: string;
  quantity: number;
  reason: StockMovementReason;
  note: string;
  time: string;
};

type AdjustmentRow = {
  id: string;
  ingredientId: string;
  date: string;
  quantityDelta: number;
  note: string;
  time: string;
};

const DEMO_PURCHASE_ROWS: PurchaseRow[] = [
  { id: "pur-20", ingredientId: "ing-rice", date: "2026-06-05", quantity: 5000, totalPrice: 238, note: "เปิดร้าน", time: "08:30" },
  { id: "pur-pkg-01", ingredientId: "ing-box", date: "2026-06-05", quantity: 500, totalPrice: 1750, note: "เปิดร้าน", time: "08:32" },
  { id: "pur-pkg-02", ingredientId: "ing-chopsticks", date: "2026-06-05", quantity: 500, totalPrice: 400, note: "เปิดร้าน", time: "08:33" },
  { id: "pur-pkg-03", ingredientId: "ing-bag", date: "2026-06-05", quantity: 1000, totalPrice: 600, note: "เปิดร้าน", time: "08:34" },
  { id: "pur-19", ingredientId: "ing-carrot", date: "2026-06-10", quantity: 300, totalPrice: 24, note: null, time: "10:00" },
  { id: "pur-18", ingredientId: "ing-seaweed", date: "2026-06-15", quantity: 10, totalPrice: 82, note: null, time: "14:00" },
  { id: "pur-17", ingredientId: "ing-pork", date: "2026-06-18", quantity: 800, totalPrice: 112, note: "โปร weekend", time: "11:00" },
  { id: "pur-16", ingredientId: "ing-egg", date: "2026-06-20", quantity: 30, totalPrice: 114, note: null, time: "07:30" },
  { id: "pur-15", ingredientId: "ing-rice", date: "2026-06-22", quantity: 5000, totalPrice: 240, note: null, time: "09:00" },
  { id: "pur-31", ingredientId: "ing-seaweed", date: "2026-06-22", quantity: 20, totalPrice: 165, note: "แพ็คใหญ่", time: "15:30" },
  { id: "pur-14", ingredientId: "ing-oil", date: "2026-06-25", quantity: 250, totalPrice: 145, note: null, time: "15:00" },
  { id: "pur-21", ingredientId: "ing-carrot", date: "2026-06-16", quantity: 500, totalPrice: 42, note: null, time: "10:20" },
  { id: "pur-22", ingredientId: "ing-carrot", date: "2026-06-24", quantity: 500, totalPrice: 40, note: "ตลาดเช้า", time: "08:15" },
  { id: "pur-29", ingredientId: "ing-pork", date: "2026-06-26", quantity: 1000, totalPrice: 138, note: null, time: "09:20" },
  { id: "pur-13", ingredientId: "ing-carrot", date: "2026-06-28", quantity: 500, totalPrice: 42, note: null, time: "10:20" },
  { id: "pur-23", ingredientId: "ing-egg", date: "2026-06-27", quantity: 30, totalPrice: 117, note: "สั่งเสาร์", time: "07:00" },
  { id: "pur-12", ingredientId: "ing-seaweed", date: "2026-07-02", quantity: 20, totalPrice: 168, note: "แพ็คใหญ่", time: "13:10" },
  { id: "pur-11", ingredientId: "ing-rice", date: "2026-07-03", quantity: 2500, totalPrice: 128, note: "ซื้อเสริม", time: "16:00" },
  { id: "pur-32", ingredientId: "ing-seaweed", date: "2026-07-05", quantity: 25, totalPrice: 205, note: "เติมก่อนเสาร์", time: "10:00" },
  { id: "pur-10", ingredientId: "ing-pork", date: "2026-07-07", quantity: 500, totalPrice: 78, note: null, time: "09:45" },
  { id: "pur-09", ingredientId: "ing-egg", date: "2026-07-08", quantity: 20, totalPrice: 76, note: null, time: "08:00" },
  { id: "pur-08", ingredientId: "ing-carrot", date: "2026-07-09", quantity: 300, totalPrice: 25, note: "ลดราคา", time: "11:30" },
  { id: "pur-07", ingredientId: "ing-rice", date: "2026-07-10", quantity: 5000, totalPrice: 250, note: null, time: "10:00" },
  { id: "pur-26", ingredientId: "ing-carrot", date: "2026-07-11", quantity: 500, totalPrice: 45, note: "เติมสต็อก", time: "08:40" },
  { id: "pur-30", ingredientId: "ing-pork", date: "2026-07-12", quantity: 700, totalPrice: 98, note: null, time: "09:10" },
  { id: "pur-25", ingredientId: "ing-egg", date: "2026-07-06", quantity: 30, totalPrice: 118, note: null, time: "07:15" },
  { id: "pur-27", ingredientId: "ing-egg", date: "2026-07-13", quantity: 30, totalPrice: 115, note: "สั่งเช้า", time: "07:20" },
  { id: "pur-05", ingredientId: "ing-seaweed", date: "2026-07-14", quantity: 10, totalPrice: 85, note: "Shopee", time: "14:20" },
  { id: "pur-06", ingredientId: "ing-oil", date: "2026-07-14", quantity: 500, totalPrice: 273, note: null, time: "14:22" },
  { id: "pur-04", ingredientId: "ing-pork", date: "2026-07-15", quantity: 600, totalPrice: 86, note: null, time: "08:05" },
  { id: "pur-03", ingredientId: "ing-egg", date: "2026-07-15", quantity: 30, totalPrice: 120, note: "สั่งเช้า", time: "07:40" },
  { id: "pur-02", ingredientId: "ing-carrot", date: "2026-07-16", quantity: 300, totalPrice: 27, note: null, time: "09:15" },
  { id: "pur-01", ingredientId: "ing-rice", date: "2026-07-16", quantity: 5000, totalPrice: 245, note: "ตลาดสด", time: "09:12" },
  { id: "pur-33", ingredientId: "ing-carrot", date: "2026-07-04", quantity: 400, totalPrice: 36, note: null, time: "11:00" },
  { id: "pur-34", ingredientId: "ing-pork", date: "2026-07-04", quantity: 800, totalPrice: 108, note: "เตรียมเสาร์", time: "11:30" },
  // เติมสต็อกรายสัปดาห์
  { id: "pur-w01", ingredientId: "ing-carrot", date: "2026-06-06", quantity: 600, totalPrice: 48, note: "เติมประจำสัปดาห์", time: "07:00" },
  { id: "pur-w02", ingredientId: "ing-pork", date: "2026-06-06", quantity: 800, totalPrice: 112, note: "เติมประจำสัปดาห์", time: "07:05" },
  { id: "pur-w03", ingredientId: "ing-egg", date: "2026-06-06", quantity: 30, totalPrice: 114, note: "เติมประจำสัปดาห์", time: "07:10" },
  { id: "pur-w04", ingredientId: "ing-seaweed", date: "2026-06-06", quantity: 20, totalPrice: 168, note: "เติมประจำสัปดาห์", time: "07:15" },
  { id: "pur-w05", ingredientId: "ing-rice", date: "2026-06-13", quantity: 3000, totalPrice: 147, note: "เติมประจำสัปดาห์", time: "07:00" },
  { id: "pur-w06", ingredientId: "ing-carrot", date: "2026-06-13", quantity: 600, totalPrice: 48, note: "เติมประจำสัปดาห์", time: "07:05" },
  { id: "pur-w07", ingredientId: "ing-pork", date: "2026-06-13", quantity: 800, totalPrice: 112, note: "เติมประจำสัปดาห์", time: "07:10" },
  { id: "pur-w08", ingredientId: "ing-egg", date: "2026-06-13", quantity: 30, totalPrice: 114, note: "เติมประจำสัปดาห์", time: "07:15" },
  { id: "pur-w09", ingredientId: "ing-seaweed", date: "2026-06-13", quantity: 20, totalPrice: 168, note: "เติมประจำสัปดาห์", time: "07:20" },
  { id: "pur-w10", ingredientId: "ing-oil", date: "2026-06-20", quantity: 250, totalPrice: 140, note: "เติมน้ำมัน", time: "07:00" },
  { id: "pur-w11", ingredientId: "ing-carrot", date: "2026-06-20", quantity: 600, totalPrice: 48, note: "เติมประจำสัปดาห์", time: "07:05" },
  { id: "pur-w12", ingredientId: "ing-pork", date: "2026-06-20", quantity: 800, totalPrice: 112, note: "เติมประจำสัปดาห์", time: "07:10" },
  { id: "pur-w13", ingredientId: "ing-egg", date: "2026-06-20", quantity: 30, totalPrice: 114, note: "เติมประจำสัปดาห์", time: "07:15" },
  { id: "pur-w14", ingredientId: "ing-seaweed", date: "2026-06-20", quantity: 20, totalPrice: 168, note: "เติมประจำสัปดาห์", time: "07:20" },
  { id: "pur-w15", ingredientId: "ing-rice", date: "2026-06-27", quantity: 3000, totalPrice: 147, note: "เติมประจำสัปดาห์", time: "07:00" },
  { id: "pur-w16", ingredientId: "ing-carrot", date: "2026-06-27", quantity: 600, totalPrice: 48, note: "เติมประจำสัปดาห์", time: "07:05" },
  { id: "pur-w17", ingredientId: "ing-pork", date: "2026-06-27", quantity: 800, totalPrice: 112, note: "เติมประจำสัปดาห์", time: "07:10" },
  { id: "pur-w18", ingredientId: "ing-egg", date: "2026-06-27", quantity: 30, totalPrice: 114, note: "เติมประจำสัปดาห์", time: "07:15" },
  { id: "pur-w19", ingredientId: "ing-seaweed", date: "2026-06-27", quantity: 20, totalPrice: 168, note: "เติมประจำสัปดาห์", time: "07:20" },
  { id: "pur-w20", ingredientId: "ing-carrot", date: "2026-07-04", quantity: 600, totalPrice: 48, note: "เติมประจำสัปดาห์", time: "07:00" },
  { id: "pur-w21", ingredientId: "ing-pork", date: "2026-07-04", quantity: 800, totalPrice: 112, note: "เติมประจำสัปดาห์", time: "07:05" },
  { id: "pur-w22", ingredientId: "ing-egg", date: "2026-07-04", quantity: 30, totalPrice: 114, note: "เติมประจำสัปดาห์", time: "07:10" },
  { id: "pur-w23", ingredientId: "ing-seaweed", date: "2026-07-04", quantity: 20, totalPrice: 168, note: "เติมประจำสัปดาห์", time: "07:15" },
  { id: "pur-w24", ingredientId: "ing-oil", date: "2026-07-11", quantity: 250, totalPrice: 140, note: "เติมน้ำมัน", time: "07:00" },
  { id: "pur-w25", ingredientId: "ing-rice", date: "2026-07-11", quantity: 3000, totalPrice: 147, note: "เติมประจำสัปดาห์", time: "07:05" },
  { id: "pur-w26", ingredientId: "ing-carrot", date: "2026-07-11", quantity: 600, totalPrice: 48, note: "เติมประจำสัปดาห์", time: "07:10" },
  { id: "pur-w27", ingredientId: "ing-pork", date: "2026-07-11", quantity: 800, totalPrice: 112, note: "เติมประจำสัปดาห์", time: "07:15" },
  { id: "pur-w28", ingredientId: "ing-egg", date: "2026-07-11", quantity: 30, totalPrice: 114, note: "เติมประจำสัปดาห์", time: "07:20" },
  { id: "pur-w29", ingredientId: "ing-seaweed", date: "2026-07-11", quantity: 20, totalPrice: 168, note: "เติมประจำสัปดาห์", time: "07:25" },
  { id: "pur-pkg-w01", ingredientId: "ing-box", date: "2026-06-13", quantity: 200, totalPrice: 700, note: "เติมประจำสัปดาห์", time: "07:22" },
  { id: "pur-pkg-w02", ingredientId: "ing-chopsticks", date: "2026-06-13", quantity: 200, totalPrice: 160, note: "เติมประจำสัปดาห์", time: "07:23" },
  { id: "pur-pkg-w03", ingredientId: "ing-bag", date: "2026-06-13", quantity: 400, totalPrice: 240, note: "เติมประจำสัปดาห์", time: "07:24" },
  { id: "pur-pkg-w04", ingredientId: "ing-box", date: "2026-06-27", quantity: 200, totalPrice: 700, note: "เติมประจำสัปดาห์", time: "07:22" },
  { id: "pur-pkg-w05", ingredientId: "ing-chopsticks", date: "2026-06-27", quantity: 200, totalPrice: 160, note: "เติมประจำสัปดาห์", time: "07:23" },
  { id: "pur-pkg-w06", ingredientId: "ing-bag", date: "2026-06-27", quantity: 400, totalPrice: 240, note: "เติมประจำสัปดาห์", time: "07:24" },
  { id: "pur-pkg-w07", ingredientId: "ing-box", date: "2026-07-11", quantity: 200, totalPrice: 700, note: "เติมประจำสัปดาห์", time: "07:22" },
  { id: "pur-pkg-w08", ingredientId: "ing-chopsticks", date: "2026-07-11", quantity: 200, totalPrice: 160, note: "เติมประจำสัปดาห์", time: "07:23" },
  { id: "pur-pkg-w09", ingredientId: "ing-bag", date: "2026-07-11", quantity: 400, totalPrice: 240, note: "เติมประจำสัปดาห์", time: "07:24" },
  { id: "pur-35", ingredientId: "ing-pork", date: "2026-07-15", quantity: 600, totalPrice: 84, note: "เติมก่อนสุดสัปดาห์", time: "08:00" },
];

/** ยอดขาย ~2 เดือน — รวม 88 ม้วน (+ ตัดออก 5 ม้วน) */
const DEMO_SALE_ROWS: SaleRow[] = [
  { id: "sale-001", date: "2026-06-06", quantity: 3, note: "วันแรกขาย", time: "17:30" },
  { id: "sale-002", date: "2026-06-07", quantity: 2, note: "อาทิตย์", time: "17:50" },
  { id: "sale-003", date: "2026-06-08", quantity: 1, note: null, time: "18:00" },
  { id: "sale-004", date: "2026-06-09", quantity: 1, note: null, time: "18:10" },
  { id: "sale-005", date: "2026-06-10", quantity: 1, note: null, time: "17:20" },
  { id: "sale-006", date: "2026-06-11", quantity: 1, note: null, time: "18:30" },
  { id: "sale-007", date: "2026-06-12", quantity: 2, note: "ฝนตก", time: "17:00" },
  { id: "sale-008", date: "2026-06-13", quantity: 3, note: "เสาร์", time: "18:15" },
  { id: "sale-009", date: "2026-06-14", quantity: 2, note: "อาทิตย์", time: "17:50" },
  { id: "sale-010", date: "2026-06-15", quantity: 1, note: null, time: "18:00" },
  { id: "sale-011", date: "2026-06-16", quantity: 1, note: null, time: "17:40" },
  { id: "sale-012", date: "2026-06-17", quantity: 1, note: null, time: "18:05" },
  { id: "sale-013", date: "2026-06-18", quantity: 1, note: "พฤหัส", time: "18:30" },
  { id: "sale-014", date: "2026-06-19", quantity: 2, note: "ศุกร์", time: "18:30" },
  { id: "sale-015", date: "2026-06-20", quantity: 3, note: "อาทิตย์", time: "17:30" },
  { id: "sale-016", date: "2026-06-21", quantity: 2, note: null, time: "18:00" },
  { id: "sale-017", date: "2026-06-22", quantity: 1, note: null, time: "17:55" },
  { id: "sale-018", date: "2026-06-23", quantity: 1, note: null, time: "18:10" },
  { id: "sale-019", date: "2026-06-24", quantity: 1, note: null, time: "17:35" },
  { id: "sale-020", date: "2026-06-25", quantity: 1, note: null, time: "18:20" },
  { id: "sale-021", date: "2026-06-26", quantity: 2, note: "ศุกร์", time: "18:45" },
  { id: "sale-022", date: "2026-06-27", quantity: 4, note: "เสาร์ขายดี", time: "19:10" },
  { id: "sale-023", date: "2026-06-28", quantity: 2, note: "อาทิตย์", time: "17:50" },
  { id: "sale-024", date: "2026-06-29", quantity: 1, note: null, time: "18:00" },
  { id: "sale-025", date: "2026-06-30", quantity: 1, note: "ปิดเดือน", time: "17:40" },
  { id: "sale-026", date: "2026-07-01", quantity: 2, note: null, time: "18:05" },
  { id: "sale-027", date: "2026-07-02", quantity: 2, note: null, time: "17:30" },
  { id: "sale-028", date: "2026-07-03", quantity: 3, note: "ศุกร์", time: "18:40" },
  { id: "sale-029", date: "2026-07-04", quantity: 6, note: "เสาร์ขายดี", time: "19:00" },
  { id: "sale-030", date: "2026-07-05", quantity: 3, note: "อาทิตย์", time: "18:15" },
  { id: "sale-031", date: "2026-07-06", quantity: 2, note: null, time: "17:50" },
  { id: "sale-032", date: "2026-07-07", quantity: 2, note: null, time: "18:00" },
  { id: "sale-033", date: "2026-07-08", quantity: 2, note: null, time: "17:45" },
  { id: "sale-034", date: "2026-07-09", quantity: 2, note: null, time: "18:10" },
  { id: "sale-035", date: "2026-07-10", quantity: 3, note: "ศุกร์", time: "18:30" },
  { id: "sale-036", date: "2026-07-11", quantity: 4, note: "เสาร์", time: "19:05" },
  { id: "sale-037", date: "2026-07-12", quantity: 3, note: "อาทิตย์", time: "18:00" },
  { id: "sale-038", date: "2026-07-13", quantity: 2, note: null, time: "17:55" },
  { id: "sale-039", date: "2026-07-14", quantity: 2, note: null, time: "18:20" },
  { id: "sale-040", date: "2026-07-15", quantity: 2, note: null, time: "18:10" },
  { id: "sale-041", date: "2026-07-16", quantity: 3, note: "ขายดี", time: "18:00" },
  { id: "sale-042", date: "2026-07-16", quantity: 2, note: "รอบเย็น", time: "20:30" },
  { id: "sale-043", date: "2026-07-17", quantity: 2, note: "วันนี้", time: "17:45" },
];

const DEMO_WASTE_ROWS: WasteRow[] = [
  { id: "waste-01", ingredientId: "ing-carrot", date: "2026-06-12", quantity: 80, reason: "spoilage", note: "แครอทเหลือง", time: "11:00" },
  { id: "waste-02", ingredientId: "ing-egg", date: "2026-06-25", quantity: 3, reason: "test", note: "ชิมสูตรใหม่", time: "15:30" },
  { id: "waste-03", ingredientId: "ing-seaweed", date: "2026-06-30", quantity: 2, reason: "spoilage", note: "สาหร่ายชื้น", time: "20:00" },
  { id: "waste-04", ingredientId: "ing-oil", date: "2026-07-01", quantity: 15, reason: "personal", note: "ใช้ทำอาหารเย็น", time: "21:00" },
  { id: "waste-05", ingredientId: "ing-pork", date: "2026-07-05", quantity: 120, reason: "unsold", note: "หมูเหลือจากวันอาทิตย์", time: "22:00" },
  { id: "waste-06", ingredientId: "ing-carrot", date: "2026-07-12", quantity: 50, reason: "spoilage", note: "แครอทเหลือง", time: "11:00" },
  { id: "waste-07", ingredientId: "ing-rice", date: "2026-07-14", quantity: 200, reason: "other", note: "ข้าวแข็งทิ้ง", time: "21:30" },
  { id: "waste-08", ingredientId: "ing-seaweed", date: "2026-07-15", quantity: 3, reason: "unsold", note: "แผ่นฉีก", time: "19:00" },
];

const DEMO_PRODUCT_WASTE_ROWS: ProductWasteRow[] = [
  { id: "pwaste-01", date: "2026-06-19", quantity: 2, reason: "unsold", note: "ทำไว้เยอะเกิน", time: "21:00" },
  { id: "pwaste-02", date: "2026-07-11", quantity: 3, reason: "test", note: "ทดลองห่อใหม่", time: "16:00" },
];

const DEMO_ADJUSTMENT_ROWS: AdjustmentRow[] = [
  { id: "adj-01", ingredientId: "ing-egg", date: "2026-07-08", quantityDelta: -2, note: "ตรวจนับ", time: "20:00" },
  { id: "adj-02", ingredientId: "ing-carrot", date: "2026-06-20", quantityDelta: 30, note: "นับเกินจากที่คิด", time: "19:30" },
  { id: "adj-03", ingredientId: "ing-pork", date: "2026-07-11", quantityDelta: -50, note: "ตรวจนับ", time: "21:00" },
  { id: "adj-04", ingredientId: "ing-oil", date: "2026-06-28", quantityDelta: -10, note: "เหลือในขวดน้อยกว่าคิด", time: "20:15" },
];

function isoAt(date: string, time: string) {
  return `${date}T${time}:00+07:00`;
}

function buildDemoTimeline() {
  const stock: Record<string, number> = {};
  const avgCost: Record<string, number> = {};
  for (const d of DEMO_INGREDIENT_DEFS) {
    stock[d.id] = 0;
    const yieldPercent =
      "priceRefYieldPercent" in d ? d.priceRefYieldPercent ?? 100 : 100;
    avgCost[d.id] =
      d.priceRefTotal / (d.priceRefQty * (yieldPercent / 100));
  }

  const purchases: Purchase[] = [];
  const sales: Sale[] = [];
  const movements: StockMovement[] = [];

  type TimelineItem = { at: string; run: () => void };
  const timeline: TimelineItem[] = [];

  for (const row of DEMO_PURCHASE_ROWS) {
    const at = isoAt(row.date, row.time);
    timeline.push({
      at,
      run: () => {
        const unitCost = row.totalPrice / row.quantity;
        avgCost[row.ingredientId] = computeWeightedAvgCost(
          stock[row.ingredientId],
          avgCost[row.ingredientId],
          row.quantity,
          row.totalPrice
        );
        stock[row.ingredientId] += row.quantity;

        purchases.push({
          id: row.id,
          ingredient_id: row.ingredientId,
          user_id: USER,
          quantity: row.quantity,
          total_price: row.totalPrice,
          unit_cost: unitCost,
          purchased_at: row.date,
          note: row.note,
          created_at: at,
        });

        movements.push({
          id: `sm-${row.id}`,
          ingredient_id: row.ingredientId,
          user_id: USER,
          type: "purchase",
          quantity: row.quantity,
          unit_cost: unitCost,
          reference_id: row.id,
          note: row.note ?? "ซื้อเข้า",
          created_at: at,
        });
      },
    });
  }

  for (const row of DEMO_SALE_ROWS) {
    const at = isoAt(row.date, row.time);
    timeline.push({
      at,
      run: () => {
        const channel = demoSaleChannel(row.id);
        sales.push({
          id: row.id,
          user_id: USER,
          product_id: PRODUCT_ID,
          quantity: row.quantity,
          sale_date: row.date,
          channel,
          gp_percent: getGpPercentForChannel(channel),
          note: row.note,
          created_at: at,
        });

        for (const [ingredientId, perRoll] of Object.entries(RECIPE_PER_ROLL)) {
          const usageQty = perRoll * row.quantity;
          const costAtSale = avgCost[ingredientId];
          stock[ingredientId] = Math.max(0, stock[ingredientId] - usageQty);
          movements.push({
            id: `sm-${row.id}-${ingredientId}`,
            ingredient_id: ingredientId,
            user_id: USER,
            type: "usage",
            quantity: -usageQty,
            unit_cost: costAtSale,
            reference_id: row.id,
            note: `ขาย ${row.quantity} ม้วน`,
            created_at: at,
          });
        }
      },
    });
  }

  for (const row of DEMO_WASTE_ROWS) {
    const at = isoAt(row.date, row.time);
    timeline.push({
      at,
      run: () => {
        stock[row.ingredientId] = Math.max(
          0,
          stock[row.ingredientId] - row.quantity
        );
        movements.push({
          id: row.id,
          ingredient_id: row.ingredientId,
          user_id: USER,
          type: "waste",
          quantity: -row.quantity,
          unit_cost: avgCost[row.ingredientId],
          reference_id: row.referenceId ?? null,
          reason: row.reason,
          note: row.note,
          created_at: at,
        });
      },
    });
  }

  for (const row of DEMO_PRODUCT_WASTE_ROWS) {
    const at = isoAt(row.date, row.time);
    timeline.push({
      at,
      run: () => {
        for (const [ingredientId, perRoll] of Object.entries(RECIPE_PER_ROLL)) {
          const qty = perRoll * row.quantity;
          stock[ingredientId] = Math.max(0, stock[ingredientId] - qty);
          movements.push({
            id: `${row.id}-${ingredientId}`,
            ingredient_id: ingredientId,
            user_id: USER,
            type: "waste",
            quantity: -qty,
            unit_cost: avgCost[ingredientId],
            reference_id: PRODUCT_ID,
            reason: row.reason,
            note: `${row.note} · คิมบับ ${row.quantity} ม้วน`,
            created_at: at,
          });
        }
      },
    });
  }

  for (const row of DEMO_ADJUSTMENT_ROWS) {
    const at = isoAt(row.date, row.time);
    timeline.push({
      at,
      run: () => {
        stock[row.ingredientId] += row.quantityDelta;
        movements.push({
          id: row.id,
          ingredient_id: row.ingredientId,
          user_id: USER,
          type: "adjustment",
          quantity: row.quantityDelta,
          unit_cost: avgCost[row.ingredientId],
          reference_id: null,
          reason: "count",
          note: row.note,
          created_at: at,
        });
      },
    });
  }

  timeline.sort((a, b) => a.at.localeCompare(b.at));
  for (const item of timeline) {
    item.run();
  }

  const ingredientMap = new Map<string, Ingredient>(
    DEMO_INGREDIENT_DEFS.map((d) => [
      d.id,
      {
        id: d.id,
        user_id: USER,
        name: d.name,
        unit: d.unit,
        unit_label: d.unit_label,
        category: d.category,
        current_stock: stock[d.id],
        avg_unit_cost: avgCost[d.id],
        price_ref_quantity: d.priceRefQty,
        price_ref_total: d.priceRefTotal,
        price_ref_yield_percent:
          "priceRefYieldPercent" in d ? d.priceRefYieldPercent ?? 100 : 100,
        low_stock_alert: d.low,
        sort_order: d.sort,
        created_at: "2026-06-01T00:00:00Z",
      },
    ])
  );

  const ingredients = [...ingredientMap.values()];
  const attachIngredient = (m: Omit<StockMovement, "ingredient">) => ({
    ...m,
    ingredient: ingredientMap.get(m.ingredient_id),
  });

  return {
    ingredients,
    purchases,
    sales,
    stockMovements: movements.map(attachIngredient),
  };
}

const demoBuilt = buildDemoTimeline();

export const demoIngredients: Ingredient[] = demoBuilt.ingredients;

export const demoPurchases: Purchase[] = demoBuilt.purchases.sort(
  (a, b) =>
    new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
);

export const demoProducts: Product[] = [
  {
    id: PRODUCT_ID,
    user_id: USER,
    name: "คิมบับ",
    selling_price: 89,
    target_cost_min_percent: 30,
    target_cost_max_percent: 35,
    is_active: true,
    created_at: "2026-06-01T00:00:00Z",
  },
];

export const demoRecipeItems: RecipeItem[] = [
  { id: "r1", product_id: PRODUCT_ID, ingredient_id: "ing-rice", quantity_per_roll: 45.45, batch_quantity: 45.45, batch_yield: 1 },
  { id: "r2", product_id: PRODUCT_ID, ingredient_id: "ing-carrot", quantity_per_roll: 75, batch_quantity: 75, batch_yield: 1 },
  { id: "r3", product_id: PRODUCT_ID, ingredient_id: "ing-pork", quantity_per_roll: 100, batch_quantity: 100, batch_yield: 1 },
  { id: "r4", product_id: PRODUCT_ID, ingredient_id: "ing-egg", quantity_per_roll: 1, batch_quantity: 1, batch_yield: 1 },
  { id: "r5", product_id: PRODUCT_ID, ingredient_id: "ing-seaweed", quantity_per_roll: 1, batch_quantity: 1, batch_yield: 1 },
  { id: "r6", product_id: PRODUCT_ID, ingredient_id: "ing-oil", quantity_per_roll: 5, batch_quantity: 5, batch_yield: 1 },
  { id: "r7", product_id: PRODUCT_ID, ingredient_id: "ing-box", quantity_per_roll: 1, batch_quantity: 1, batch_yield: 1 },
  { id: "r8", product_id: PRODUCT_ID, ingredient_id: "ing-chopsticks", quantity_per_roll: 1, batch_quantity: 1, batch_yield: 1 },
  { id: "r9", product_id: PRODUCT_ID, ingredient_id: "ing-bag", quantity_per_roll: 1, batch_quantity: 1, batch_yield: 1 },
];

export const demoSales: Sale[] = demoBuilt.sales.sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

export const demoStockMovements: StockMovement[] = demoBuilt.stockMovements.sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

export const demoOperatingExpenses: OperatingExpense[] = [
  {
    id: "exp-01",
    user_id: USER,
    expense_date: "2026-07-16",
    category: "transport",
    amount: 156,
    note: "รถไฟไปตลาดสด 2 วัน",
    created_at: "2026-07-16T08:30:00+07:00",
  },
  {
    id: "exp-02",
    user_id: USER,
    expense_date: "2026-07-14",
    category: "packaging",
    amount: 180,
    note: "สติกเกอร์โลโก้ร้าน (ไม่ใส่สูตร)",
    created_at: "2026-07-14T15:10:00+07:00",
  },
  {
    id: "exp-03",
    user_id: USER,
    expense_date: "2026-07-12",
    category: "marketing",
    amount: 300,
    note: "Boost โพสต์ Facebook วันเสาร์",
    created_at: "2026-07-12T11:00:00+07:00",
  },
  {
    id: "exp-04",
    user_id: USER,
    expense_date: "2026-07-10",
    category: "utilities",
    amount: 420,
    note: "ค่าไฟครัวเดือนนี้",
    created_at: "2026-07-10T19:00:00+07:00",
  },
  {
    id: "exp-05",
    user_id: USER,
    expense_date: "2026-07-08",
    category: "fees",
    amount: 125,
    note: "ค่าธรรมเนียม Grab สัปดาห์ที่แล้ว",
    created_at: "2026-07-08T20:15:00+07:00",
  },
  {
    id: "exp-06",
    user_id: USER,
    expense_date: "2026-07-06",
    category: "labor",
    amount: 1500,
    note: "จ้างช่วยห่อวันเสาร์",
    created_at: "2026-07-06T21:30:00+07:00",
  },
  {
    id: "exp-07",
    user_id: USER,
    expense_date: "2026-07-05",
    category: "equipment",
    amount: 890,
    note: "ถุงมือ + ตะแกรงสแตนเลส",
    created_at: "2026-07-05T14:20:00+07:00",
  },
  {
    id: "exp-03b",
    user_id: USER,
    expense_date: "2026-07-03",
    category: "transport",
    amount: 280,
    note: "แท็กซี่ขนของไปตลาดนัด",
    created_at: "2026-07-03T06:45:00+07:00",
  },
  {
    id: "exp-08",
    user_id: USER,
    expense_date: "2026-07-01",
    category: "rent",
    amount: 3500,
    note: "ค่าเช่าครัวรวมที่จอดรถ",
    created_at: "2026-07-01T09:00:00+07:00",
  },
  {
    id: "exp-09",
    user_id: USER,
    expense_date: "2026-07-15",
    category: "other",
    amount: 200,
    note: "ทิชชู่ + ถุงขยะ + น้ำยาล้างจาน",
    created_at: "2026-07-15T17:40:00+07:00",
  },
  {
    id: "exp-10",
    user_id: USER,
    expense_date: "2026-06-15",
    category: "transport",
    amount: 320,
    note: "รถไฟ + แท็กซี่ไปตลาด",
    created_at: "2026-06-15T07:20:00+07:00",
  },
  {
    id: "exp-11",
    user_id: USER,
    expense_date: "2026-06-01",
    category: "rent",
    amount: 3500,
    note: "ค่าเช่าครัวเดือนมิ.ย.",
    created_at: "2026-06-01T09:00:00+07:00",
  },
];

export const demoProductsWithCost: ProductWithCost[] = [];
export const demoWeeklySales: { date: string; rolls: number; profit: number }[] = [];
export const demoDailySummary = {
  totalRolls: 0,
  totalRevenue: 0,
  totalCost: 0,
  totalProfit: 0,
};
export const demoMonthlyReport: {
  date: string;
  rolls: number;
  profit: number;
  revenue: number;
  cost: number;
}[] = [];
export const demoTopProducts: { name: string; quantity: number; revenue: number }[] = [];
