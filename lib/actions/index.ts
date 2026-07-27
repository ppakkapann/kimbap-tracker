"use server";

import { revalidatePath } from "next/cache";
import { computeWeightedAvgCost, recomputeAvgUnitCostFromPurchases } from "@/lib/accounting";
import { normalizeSaleLocation, getGpPercentForChannel } from "@/lib/sales-channels";
import { isDemoMode } from "@/lib/config";
import { normalizeIngredientCategory } from "@/lib/ingredient-categories";
import { calculatePurchaseYield, effectiveUnitCostFromPriceRef, yieldPercentFromQuantities } from "@/lib/purchase-yield";
import { usageQuantityFromRecipe } from "@/lib/recipe-batch";
import {
  validateSaleBatchStock,
} from "@/lib/sale-stock";
import {
  areUnitsCompatible,
  normalizePurchaseQuantity,
  normalizeStorageUnit,
  scaleIngredientQuantities,
} from "@/lib/unit-conversion";
import {
  demoAdjustStock,
  demoCreateIngredient,
  demoCreateProduct,
  demoDeleteIngredient,
  demoDeleteOperatingExpense,
  demoDeleteProduct,
  demoDeletePurchase,
  demoDeleteSale,
  demoRecordIngredientWaste,
  demoRecordOperatingExpense,
  demoRecordProductWaste,
  demoRecordPurchase,
  demoRecordSale,
  demoRecordSaleBatch,
  demoReorderIngredients,
  demoSaveIngredientRecipeRows,
  demoSaveRecipeItems,
  demoUpdateIngredient,
  demoUpdateProduct,
  demoUpdateSale,
  resetDemoStore,
} from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { formatSupabaseAuthError } from "@/lib/supabase/env";
import type { IngredientCategory, IngredientUnit, StockMovementReason } from "@/lib/types";

const DEMO_ERROR = "โหมด Demo — ตั้งค่า Supabase เพื่อบันทึกข้อมูล";

async function requireAuth() {
  const supabase = await createClient();
  if (!supabase) throw new Error(DEMO_ERROR);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่ได้เข้าสู่ระบบ");
  return { supabase, userId: user.id };
}

function demoGuard<T extends { error: string | null }>(
  fn: () => Promise<T>,
  demoFn: () => T
): Promise<T> {
  if (isDemoMode()) {
    const result = demoFn();
    revalidateDemoPaths();
    return Promise.resolve(result);
  }
  return fn().catch((e: Error) => ({ error: e.message }) as T);
}

function revalidateDemoPaths() {
  revalidatePath("/");
  revalidatePath("/ingredients");
  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/sales");
  revalidatePath("/reports");
  revalidatePath("/accounting");
}

export async function resetDemoData() {
  if (!isDemoMode()) return { error: "ใช้ได้เฉพาะโหมด Demo" };
  resetDemoStore();
  revalidateDemoPaths();
  return { error: null };
}

export async function recordOperatingExpense(data: {
  expense_date: string;
  category: string;
  amount: number;
  note?: string;
}) {
  return demoGuard(async () => {
    if (!data.expense_date || !data.category.trim()) {
      return { error: "กรุณากรอกวันที่และประเภทค่าใช้จ่าย" };
    }
    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      return { error: "จำนวนเงินต้องมากกว่า 0" };
    }

    const { supabase, userId } = await requireAuth();
    const { error } = await supabase.from("operating_expenses").insert({
      user_id: userId,
      expense_date: data.expense_date,
      category: data.category.trim(),
      amount: data.amount,
      note: data.note?.trim() || null,
    });
    if (error) return { error: error.message };

    revalidatePath("/accounting");
    revalidatePath("/");
    return { error: null };
  }, () => demoRecordOperatingExpense(data));
}

export async function deleteOperatingExpense(id: string) {
  return demoGuard(async () => {
    const { supabase } = await requireAuth();
    const { error } = await supabase
      .from("operating_expenses")
      .delete()
      .eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/accounting");
    revalidatePath("/");
    return { error: null };
  }, () => demoDeleteOperatingExpense(id));
}

export async function signIn(email: string, password: string) {
  if (isDemoMode()) return { error: null };
  try {
    const supabase = await createClient();
    if (!supabase) return { error: DEMO_ERROR };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: formatSupabaseAuthError(e) };
  }
}

export async function signUp(email: string, password: string) {
  if (isDemoMode()) return { error: null };
  try {
    const supabase = await createClient();
    if (!supabase) return { error: DEMO_ERROR };
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: formatSupabaseAuthError(e) };
  }
}

export async function signOut() {
  if (isDemoMode()) return;
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
}

export async function createIngredient(data: {
  name: string;
  unit: IngredientUnit;
  unit_label?: string | null;
  category?: IngredientCategory;
  low_stock_alert: number;
}) {
  return demoGuard(
    async () => {
      const { supabase, userId } = await requireAuth();
      const { data: last } = await supabase
        .from("ingredients")
        .select("sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const normalizedUnit = normalizeStorageUnit(data.unit);

      const { error } = await supabase.from("ingredients").insert({
        user_id: userId,
        name: data.name,
        unit: normalizedUnit,
        unit_label: data.unit_label?.trim() || null,
        category: normalizeIngredientCategory(data.category),
        low_stock_alert: data.low_stock_alert,
        current_stock: 0,
        avg_unit_cost: 0,
        sort_order: (last?.sort_order ?? -1) + 1,
      });
      if (error) return { error: error.message };
      revalidatePath("/ingredients");
      revalidatePath("/stock");
      revalidatePath("/");
      return { error: null };
    },
    () => demoCreateIngredient(data)
  );
}

export async function updateIngredient(
  id: string,
  data: {
    name: string;
    unit: IngredientUnit;
    unit_label?: string | null;
    category?: IngredientCategory;
    low_stock_alert: number;
    price_ref_quantity?: number | null;
    price_ref_total?: number | null;
    price_ref_yield_percent?: number | null;
  }
) {
  return demoGuard(
    async () => {
      const { supabase } = await requireAuth();
      const normalizedUnit = normalizeStorageUnit(data.unit);

      const { data: existing, error: fetchError } = await supabase
        .from("ingredients")
        .select(
          "unit, current_stock, low_stock_alert, price_ref_quantity, avg_unit_cost"
        )
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        return { error: fetchError?.message ?? "ไม่พบวัตถุดิบ" };
      }

      const oldUnit = existing.unit as IngredientUnit;
      const unitChanged = oldUnit !== normalizedUnit;

      const priceRefUpdate: Record<string, number | null> = {};
      if (data.price_ref_quantity !== undefined) {
        priceRefUpdate.price_ref_quantity = data.price_ref_quantity;
      }
      if (data.price_ref_total !== undefined) {
        priceRefUpdate.price_ref_total = data.price_ref_total;
      }
      if (data.price_ref_yield_percent !== undefined) {
        priceRefUpdate.price_ref_yield_percent = data.price_ref_yield_percent;
      }

      const ingredientUpdate: Record<string, unknown> = {
        name: data.name,
        unit: normalizedUnit,
        unit_label: data.unit_label?.trim() || null,
        category: normalizeIngredientCategory(data.category),
        low_stock_alert: data.low_stock_alert,
        ...priceRefUpdate,
      };

      if (unitChanged && areUnitsCompatible(oldUnit, normalizedUnit)) {
        const scaled = scaleIngredientQuantities(
          {
            current_stock: existing.current_stock ?? 0,
            low_stock_alert: existing.low_stock_alert ?? 0,
            price_ref_quantity: existing.price_ref_quantity,
            avg_unit_cost: existing.avg_unit_cost ?? 0,
          },
          oldUnit,
          normalizedUnit
        );

        ingredientUpdate.current_stock = scaled.current_stock;
        ingredientUpdate.avg_unit_cost = scaled.avg_unit_cost;

        if (data.price_ref_quantity === undefined && scaled.price_ref_quantity != null) {
          priceRefUpdate.price_ref_quantity = scaled.price_ref_quantity;
          ingredientUpdate.price_ref_quantity = scaled.price_ref_quantity;
        }

        const { data: recipeRows } = await supabase
          .from("recipe_items")
          .select("id, quantity_per_roll, batch_quantity")
          .eq("ingredient_id", id);

        for (const row of recipeRows ?? []) {
          const recipeScaled = scaleIngredientQuantities(
            {
              current_stock: 0,
              low_stock_alert: 0,
              price_ref_quantity: null,
              avg_unit_cost: 0,
              quantity_per_roll: row.quantity_per_roll,
              batch_quantity: row.batch_quantity,
            },
            oldUnit,
            normalizedUnit
          );
          await supabase
            .from("recipe_items")
            .update({
              quantity_per_roll: recipeScaled.quantity_per_roll,
              batch_quantity: recipeScaled.batch_quantity,
            })
            .eq("id", row.id);
        }
      }

      const { error } = await supabase
        .from("ingredients")
        .update(ingredientUpdate)
        .eq("id", id);
      if (error) return { error: error.message };
      revalidatePath("/ingredients");
      revalidatePath(`/ingredients/${id}`);
      revalidatePath("/stock");
      revalidatePath("/");
      return { error: null };
    },
    () => demoUpdateIngredient(id, data)
  );
}

export async function deleteIngredient(id: string) {
  return demoGuard(
    async () => {
      const { supabase } = await requireAuth();
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) return { error: error.message };
      revalidatePath("/ingredients");
      revalidatePath("/stock");
      revalidatePath("/");
      return { error: null };
    },
    () => demoDeleteIngredient(id)
  );
}

export async function reorderIngredients(orderedIds: string[]) {
  return demoGuard(
    async () => {
      const { supabase } = await requireAuth();

      for (let index = 0; index < orderedIds.length; index++) {
        const { error } = await supabase
          .from("ingredients")
          .update({ sort_order: index })
          .eq("id", orderedIds[index]);
        if (error) return { error: error.message };
      }

      revalidatePath("/ingredients");
      revalidatePath("/stock");
      return { error: null };
    },
    () => demoReorderIngredients(orderedIds)
  );
}

export async function saveIngredientRecipeRows(
  productId: string,
  rows: {
    id: string;
    name: string;
    unit: IngredientUnit;
    currentStock: number;
    purchaseQuantity: number;
    purchaseTotalPrice: number;
    purchaseYieldPercent?: number;
    purchaseUsableQuantity?: number;
    quantityPerRoll: number;
  }[]
) {
  return demoGuard(async () => {
    const { supabase } = await requireAuth();

    for (const row of rows) {
      const yieldPercent =
        row.purchaseUsableQuantity != null &&
        row.purchaseUsableQuantity > 0 &&
        row.purchaseQuantity > 0
          ? yieldPercentFromQuantities(
              row.purchaseQuantity,
              row.purchaseUsableQuantity
            )
          : row.purchaseYieldPercent ?? 100;

      const priceRefUpdate =
        row.purchaseQuantity > 0 && row.purchaseTotalPrice >= 0
          ? {
              price_ref_quantity: row.purchaseQuantity,
              price_ref_total: row.purchaseTotalPrice,
              price_ref_yield_percent: yieldPercent,
            }
          : {};

      const { count: purchaseCount } = await supabase
        .from("purchases")
        .select("*", { count: "exact", head: true })
        .eq("ingredient_id", row.id);

      const hasPurchases = (purchaseCount ?? 0) > 0;
      const avgFromRef =
        row.purchaseQuantity > 0 && row.purchaseTotalPrice >= 0
          ? effectiveUnitCostFromPriceRef(
              row.purchaseQuantity,
              row.purchaseTotalPrice,
              yieldPercent
            )
          : null;

      const { error: ingredientError } = await supabase
        .from("ingredients")
        .update({
          name: row.name,
          unit: row.unit,
          current_stock: Math.max(0, row.currentStock),
          ...priceRefUpdate,
          ...(!hasPurchases && avgFromRef != null
            ? { avg_unit_cost: avgFromRef }
            : {}),
        })
        .eq("id", row.id);

      if (ingredientError) return { error: ingredientError.message };

      if (productId && row.quantityPerRoll > 0) {
        const { error: recipeError } = await supabase
          .from("recipe_items")
          .upsert(
            {
              product_id: productId,
              ingredient_id: row.id,
              quantity_per_roll: row.quantityPerRoll,
              batch_quantity: row.quantityPerRoll,
              batch_yield: 1,
            },
            { onConflict: "product_id,ingredient_id" }
          );
        if (recipeError) return { error: recipeError.message };
      } else if (productId) {
        await supabase
          .from("recipe_items")
          .delete()
          .eq("product_id", productId)
          .eq("ingredient_id", row.id);
      }
    }

    revalidatePath("/ingredients");
    if (productId) {
      revalidatePath("/products");
      revalidatePath(`/products/${productId}`);
    }
    revalidatePath("/stock");
    revalidatePath("/accounting");
    revalidatePath("/");
    return { error: null };
  }, () => demoSaveIngredientRecipeRows(productId, rows));
}

export async function recordPurchase(data: {
  ingredient_id: string;
  quantity: number;
  purchase_unit?: IngredientUnit;
  total_price: number;
  purchased_at: string;
  supplier?: string;
  expires_at?: string;
  note?: string;
}) {
  return demoGuard(async () => {
    if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
      return { error: "จำนวนที่ซื้อต้องมากกว่า 0" };
    }
    if (!Number.isFinite(data.total_price) || data.total_price < 0) {
      return { error: "ราคารวมต้องไม่ติดลบ" };
    }

    const { supabase, userId } = await requireAuth();

    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("current_stock, avg_unit_cost, unit")
      .eq("id", data.ingredient_id)
      .single();

    if (!ingredient) return { error: "ไม่พบวัตถุดิบ" };

    const ingredientUnit = normalizeStorageUnit(
      ingredient.unit as IngredientUnit
    );
    const purchaseUnit = data.purchase_unit ?? ingredientUnit;
    const stockQuantity = normalizePurchaseQuantity(
      data.quantity,
      purchaseUnit,
      ingredientUnit
    );

    const unitCost = stockQuantity > 0 ? data.total_price / stockQuantity : 0;

    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        ingredient_id: data.ingredient_id,
        user_id: userId,
        quantity: stockQuantity,
        gross_quantity: stockQuantity,
        yield_percent: 100,
        prep_pending: false,
        total_price: data.total_price,
        unit_cost: unitCost,
        gross_unit_cost: unitCost,
        purchased_at: data.purchased_at,
        supplier: data.supplier?.trim() || null,
        expires_at: data.expires_at || null,
        note: data.note || null,
      })
      .select()
      .single();

    if (purchaseError) return { error: purchaseError.message };

    const stockBefore = ingredient.current_stock ?? 0;
    const avgBefore = ingredient.avg_unit_cost ?? 0;
    const newAvg = computeWeightedAvgCost(
      stockBefore,
      avgBefore,
      stockQuantity,
      data.total_price
    );
    const newStock = stockBefore + stockQuantity;

    const { error: stockError } = await supabase
      .from("ingredients")
      .update({ current_stock: newStock, avg_unit_cost: newAvg })
      .eq("id", data.ingredient_id);

    if (stockError) return { error: stockError.message };

    await supabase.from("stock_movements").insert({
      ingredient_id: data.ingredient_id,
      user_id: userId,
      type: "purchase",
      quantity: stockQuantity,
      unit_cost: unitCost,
      reference_id: purchase.id,
      note: data.note || "ซื้อเข้า",
    });

    revalidatePath("/ingredients");
    revalidatePath(`/ingredients/${data.ingredient_id}`);
    revalidatePath("/stock");
    revalidatePath("/accounting");
    revalidatePath("/");
    return { error: null };
  }, () => demoRecordPurchase(data));
}

export async function deletePurchase(purchaseId: string) {
  return demoGuard(async () => {
    const { supabase } = await requireAuth();

    const { data: purchase, error: fetchError } = await supabase
      .from("purchases")
      .select("*")
      .eq("id", purchaseId)
      .single();

    if (fetchError || !purchase) return { error: "ไม่พบรายการซื้อ" };

    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("current_stock")
      .eq("id", purchase.ingredient_id)
      .single();

    if (!ingredient) return { error: "ไม่พบวัตถุดิบ" };

    if (ingredient.current_stock < purchase.quantity) {
      return {
        error: `สต็อกเหลือไม่พอตัดย้อน (มี ${ingredient.current_stock} ต้องการ ${purchase.quantity})`,
      };
    }

    const { data: remainingPurchases } = await supabase
      .from("purchases")
      .select("*")
      .eq("ingredient_id", purchase.ingredient_id)
      .neq("id", purchaseId);

    const newAvg = recomputeAvgUnitCostFromPurchases(
      purchase.ingredient_id,
      remainingPurchases ?? []
    );

    const { error: stockError } = await supabase
      .from("ingredients")
      .update({
        current_stock: ingredient.current_stock - purchase.quantity,
        avg_unit_cost: newAvg,
      })
      .eq("id", purchase.ingredient_id);

    if (stockError) return { error: stockError.message };

    await supabase
      .from("stock_movements")
      .delete()
      .eq("reference_id", purchaseId)
      .eq("type", "purchase");

    const { error: deleteError } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchaseId);

    if (deleteError) return { error: deleteError.message };

    revalidatePath("/ingredients");
    revalidatePath(`/ingredients/${purchase.ingredient_id}`);
    revalidatePath("/stock");
    revalidatePath("/accounting");
    revalidatePath("/");
    return { error: null };
  }, () => demoDeletePurchase(purchaseId));
}

export async function adjustStock(data: {
  ingredient_id: string;
  new_stock: number;
  note?: string;
}) {
  return demoGuard(async () => {
    const { supabase, userId } = await requireAuth();

    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("current_stock, avg_unit_cost")
      .eq("id", data.ingredient_id)
      .single();

    if (!ingredient) return { error: "ไม่พบวัตถุดิบ" };

    const diff = data.new_stock - ingredient.current_stock;

    const { error: updateError } = await supabase
      .from("ingredients")
      .update({ current_stock: data.new_stock })
      .eq("id", data.ingredient_id);

    if (updateError) return { error: updateError.message };

    if (diff !== 0) {
      await supabase.from("stock_movements").insert({
        ingredient_id: data.ingredient_id,
        user_id: userId,
        type: "adjustment",
        quantity: diff,
        unit_cost: ingredient.avg_unit_cost ?? 0,
        reason: "count",
        note: data.note || "ปรับจากการตรวจนับ",
      });
    }

    revalidatePath("/ingredients");
    revalidatePath("/stock");
    revalidatePath("/accounting");
    revalidatePath("/");
    return { error: null };
  }, () => demoAdjustStock(data));
}

type WasteReason = Exclude<StockMovementReason, "count">;

const WASTE_REASON_LABELS: Record<WasteReason, string> = {
  spoilage: "ของเสีย/หมดอายุ",
  unsold: "ทำแล้วขายไม่หมด",
  test: "ทดลอง/ชิม/แจก",
  personal: "ใช้ส่วนตัว",
  other: "อื่นๆ",
};

export async function recordIngredientWaste(data: {
  ingredient_id: string;
  quantity: number;
  reason: WasteReason;
  note?: string;
}) {
  return demoGuard(async () => {
    if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
      return { error: "จำนวนที่ตัดออกต้องมากกว่า 0" };
    }

    const { supabase } = await requireAuth();
    const { error } = await supabase.rpc("record_ingredient_waste", {
      p_ingredient_id: data.ingredient_id,
      p_quantity: data.quantity,
      p_reason: data.reason,
      p_note: data.note?.trim() || WASTE_REASON_LABELS[data.reason],
    });

    if (error) return { error: error.message };

    revalidatePath("/ingredients");
    revalidatePath("/stock");
    revalidatePath("/accounting");
    revalidatePath("/");
    return { error: null };
  }, () => demoRecordIngredientWaste(data));
}

export async function recordProductWaste(data: {
  product_id: string;
  quantity: number;
  reason: WasteReason;
  note?: string;
}) {
  return demoGuard(async () => {
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
      return { error: "จำนวนม้วนต้องเป็นจำนวนเต็มมากกว่า 0" };
    }

    const { supabase } = await requireAuth();
    const { data: product } = await supabase
      .from("products")
      .select("id, name")
      .eq("id", data.product_id)
      .single();

    if (!product) return { error: "ไม่พบเมนู" };

    const detailNote = `${WASTE_REASON_LABELS[data.reason]} · ${product.name} ${data.quantity} ม้วน`;
    const { error } = await supabase.rpc("record_product_waste", {
      p_product_id: data.product_id,
      p_quantity: data.quantity,
      p_reason: data.reason,
      p_note: data.note?.trim()
        ? `${detailNote} · ${data.note.trim()}`
        : detailNote,
    });
    if (error) return { error: error.message };

    revalidatePath("/ingredients");
    revalidatePath("/stock");
    revalidatePath("/accounting");
    revalidatePath("/");
    return { error: null };
  }, () => demoRecordProductWaste(data));
}

export async function createProduct(data: {
  name: string;
  selling_price: number;
}) {
  return demoGuard(async () => {
    const { supabase, userId } = await requireAuth();
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        user_id: userId,
        name: data.name,
        selling_price: data.selling_price,
      })
      .select()
      .single();

    if (error) return { error: error.message, id: null };
    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/");
    return { error: null, id: product.id };
  }, () => demoCreateProduct(data));
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    selling_price: number;
    target_cost_min_percent: number;
    target_cost_max_percent: number;
    is_active: boolean;
  }
) {
  return demoGuard(async () => {
    if (
      !Number.isFinite(data.target_cost_min_percent) ||
      !Number.isFinite(data.target_cost_max_percent) ||
      data.target_cost_min_percent <= 0 ||
      data.target_cost_max_percent > 100 ||
      data.target_cost_min_percent > data.target_cost_max_percent
    ) {
      return { error: "ช่วงต้นทุนเป้าหมายไม่ถูกต้อง" };
    }

    const { supabase } = await requireAuth();
    const { error } = await supabase.from("products").update(data).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    revalidatePath("/stock");
    revalidatePath("/");
    return { error: null };
  }, () => demoUpdateProduct(id, data));
}

export async function deleteProduct(id: string) {
  return demoGuard(async () => {
    const { supabase } = await requireAuth();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/");
    return { error: null };
  }, () => demoDeleteProduct(id));
}

export async function saveRecipeItems(
  productId: string,
  items: {
    ingredient_id: string;
    quantity_per_roll: number;
    batch_quantity?: number;
    batch_yield?: number;
  }[]
) {
  return demoGuard(async () => {
    const { supabase } = await requireAuth();

    await supabase.from("recipe_items").delete().eq("product_id", productId);

    if (items.length > 0) {
      const { error } = await supabase.from("recipe_items").insert(
        items.map((item) => {
          const batchQty = item.batch_quantity ?? item.quantity_per_roll;
          const batchYield = item.batch_yield ?? 1;
          return {
            product_id: productId,
            ingredient_id: item.ingredient_id,
            quantity_per_roll: item.quantity_per_roll,
            batch_quantity: batchQty,
            batch_yield: batchYield,
          };
        })
      );
      if (error) return { error: error.message };
    }

    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    revalidatePath("/stock");
    revalidatePath("/");
    return { error: null };
  }, () => demoSaveRecipeItems(productId, items));
}

type SaleActionSupabase = Awaited<ReturnType<typeof createClient>>;

async function rollbackCreatedSales(
  supabase: NonNullable<SaleActionSupabase>,
  saleIds: string[]
) {
  for (const saleId of saleIds) {
    const { data: movements } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("reference_id", saleId);

    for (const movement of movements ?? []) {
      if (movement.type !== "usage") continue;
      const { data: ingredient } = await supabase
        .from("ingredients")
        .select("current_stock")
        .eq("id", movement.ingredient_id)
        .single();
      if (ingredient) {
        await supabase
          .from("ingredients")
          .update({
            current_stock: ingredient.current_stock - movement.quantity,
          })
          .eq("id", movement.ingredient_id);
      }
    }

    await supabase.from("stock_movements").delete().eq("reference_id", saleId);
    await supabase.from("sales").delete().eq("id", saleId);
  }
}

async function applySaleStockUsage(
  supabase: NonNullable<SaleActionSupabase>,
  userId: string,
  saleId: string,
  productId: string,
  quantity: number,
  note: string
): Promise<string | null> {
  const { data: recipeItems } = await supabase
    .from("recipe_items")
    .select("*")
    .eq("product_id", productId);

  for (const item of recipeItems ?? []) {
    const usageQty = usageQuantityFromRecipe(item, quantity);

    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("current_stock, avg_unit_cost, name")
      .eq("id", item.ingredient_id)
      .single();

    if (!ingredient) {
      return "ไม่พบวัตถุดิบในสูตร";
    }
    if (usageQty > ingredient.current_stock) {
      return `${ingredient.name} มีไม่พอ (ต้องใช้ ${usageQty})`;
    }

    const { error: stockError } = await supabase
      .from("ingredients")
      .update({ current_stock: ingredient.current_stock - usageQty })
      .eq("id", item.ingredient_id);

    if (stockError) return stockError.message;

    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert({
        ingredient_id: item.ingredient_id,
        user_id: userId,
        type: "usage",
        quantity: -usageQty,
        unit_cost: ingredient.avg_unit_cost ?? 0,
        reference_id: saleId,
        note,
      });

    if (movementError) return movementError.message;
  }

  return null;
}

async function validateProdSaleBatchStock(
  supabase: NonNullable<SaleActionSupabase>,
  items: { product_id: string; quantity: number }[]
): Promise<string | null> {
  const productIds = [...new Set(items.map((item) => item.product_id))];
  const [{ data: ingredients }, { data: products }, { data: recipeRows }] =
    await Promise.all([
      supabase.from("ingredients").select("id, name, current_stock"),
      supabase.from("products").select("id, name").in("id", productIds),
      supabase.from("recipe_items").select("*").in("product_id", productIds),
    ]);

  const stockById = new Map(
    (ingredients ?? []).map((row) => [row.id, row.current_stock] as const)
  );
  const nameById = new Map(
    (ingredients ?? []).map((row) => [row.id, row.name] as const)
  );
  const productNameById = new Map(
    (products ?? []).map((row) => [row.id, row.name] as const)
  );
  const recipeByProduct = new Map<string, typeof recipeRows>();
  for (const row of recipeRows ?? []) {
    const list = recipeByProduct.get(row.product_id) ?? [];
    list.push(row);
    recipeByProduct.set(row.product_id, list);
  }

  return validateSaleBatchStock(items, {
    getStock: (id) => stockById.get(id),
    getIngredientName: (id) => nameById.get(id) ?? "วัตถุดิบ",
    getRecipeItems: (productId) => recipeByProduct.get(productId) ?? [],
    getProductName: (productId) => productNameById.get(productId) ?? "เมนู",
  });
}

export async function recordSaleBatch(data: {
  items: { product_id: string; quantity: number }[];
  sale_date: string;
  channel: string;
  gp_percent?: number;
  note?: string;
}) {
  return demoGuard(async () => {
    if (!data.items.length) {
      return { error: "เพิ่มเมนูในตะกร้าก่อนบันทึก" };
    }

    for (const item of data.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return { error: "จำนวนต้องมากกว่า 0" };
      }
    }

    const { supabase, userId } = await requireAuth();
    const channel = normalizeSaleLocation(data.channel);
    const gpPercent = data.gp_percent ?? getGpPercentForChannel(channel);
    const billId = crypto.randomUUID();

    const batchStockError = await validateProdSaleBatchStock(
      supabase,
      data.items
    );
    if (batchStockError) return { error: batchStockError };

    const createdSaleIds: string[] = [];

    for (const item of data.items) {
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          user_id: userId,
          product_id: item.product_id,
          quantity: item.quantity,
          sale_date: data.sale_date,
          channel,
          gp_percent: gpPercent,
          bill_id: billId,
          note: data.note || null,
        })
        .select()
        .single();

      if (saleError) {
        await rollbackCreatedSales(supabase, createdSaleIds);
        return { error: saleError.message };
      }

      createdSaleIds.push(sale.id);

      const usageError = await applySaleStockUsage(
        supabase,
        userId,
        sale.id,
        item.product_id,
        item.quantity,
        `ขาย ${item.quantity} ม้วน`
      );
      if (usageError) {
        await rollbackCreatedSales(supabase, createdSaleIds);
        return { error: usageError };
      }
    }

    revalidatePath("/sales");
    revalidatePath("/");
    revalidatePath("/stock");
    revalidatePath("/ingredients");
    revalidatePath("/accounting");
    revalidatePath("/reports");
    return { error: null, bill_id: billId };
  }, () => demoRecordSaleBatch(data));
}

export async function updateSale(
  id: string,
  data: {
    product_id: string;
    quantity: number;
    sale_date: string;
    channel: string;
    gp_percent?: number;
    note?: string;
  }
) {
  return demoGuard(async () => {
    if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
      return { error: "จำนวนต้องมากกว่า 0" };
    }

    const { supabase, userId } = await requireAuth();
    const channel = normalizeSaleLocation(data.channel);
    const gpPercent = data.gp_percent ?? getGpPercentForChannel(channel);

    const { data: sale } = await supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .single();

    if (!sale) return { error: "ไม่พบรายการขาย" };

    const { data: movements } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("reference_id", id)
      .eq("type", "usage");

    for (const movement of movements ?? []) {
      const { data: ingredient } = await supabase
        .from("ingredients")
        .select("current_stock")
        .eq("id", movement.ingredient_id)
        .single();

      if (ingredient) {
        await supabase
          .from("ingredients")
          .update({
            current_stock: ingredient.current_stock - movement.quantity,
          })
          .eq("id", movement.ingredient_id);
      }
    }

    await supabase.from("stock_movements").delete().eq("reference_id", id);

    const { error: updateError } = await supabase
      .from("sales")
      .update({
        product_id: data.product_id,
        quantity: data.quantity,
        sale_date: data.sale_date,
        channel,
        gp_percent: gpPercent,
        note: data.note || null,
      })
      .eq("id", id);

    if (updateError) return { error: updateError.message };

    const { data: recipeItems } = await supabase
      .from("recipe_items")
      .select("*")
      .eq("product_id", data.product_id);

    for (const item of recipeItems ?? []) {
      const usageQty = usageQuantityFromRecipe(item, data.quantity);

      const { data: ingredient } = await supabase
        .from("ingredients")
        .select("current_stock, avg_unit_cost")
        .eq("id", item.ingredient_id)
        .single();

      if (ingredient) {
        await supabase
          .from("ingredients")
          .update({
            current_stock: Math.max(0, ingredient.current_stock - usageQty),
          })
          .eq("id", item.ingredient_id);

        await supabase.from("stock_movements").insert({
          ingredient_id: item.ingredient_id,
          user_id: userId,
          type: "usage",
          quantity: -usageQty,
          unit_cost: ingredient.avg_unit_cost ?? 0,
          reference_id: id,
          note: `ขาย ${data.quantity} ม้วน`,
        });
      }
    }

    revalidatePath("/sales");
    revalidatePath("/");
    revalidatePath("/stock");
    revalidatePath("/ingredients");
    revalidatePath("/accounting");
    revalidatePath("/reports");
    return { error: null };
  }, () => demoUpdateSale(id, data));
}

export async function deleteSale(id: string) {
  return demoGuard(async () => {
    const { supabase } = await requireAuth();

    const { data: sale } = await supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .single();

    if (!sale) return { error: "ไม่พบรายการขาย" };

    const { data: movements } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("reference_id", id)
      .eq("type", "usage");

    for (const movement of movements ?? []) {
      const { data: ingredient } = await supabase
        .from("ingredients")
        .select("current_stock")
        .eq("id", movement.ingredient_id)
        .single();

      if (ingredient) {
        await supabase
          .from("ingredients")
          .update({
            current_stock: ingredient.current_stock - movement.quantity,
          })
          .eq("id", movement.ingredient_id);
      }
    }

    await supabase.from("stock_movements").delete().eq("reference_id", id);
    await supabase.from("sales").delete().eq("id", id);

    revalidatePath("/sales");
    revalidatePath("/");
    revalidatePath("/stock");
    revalidatePath("/ingredients");
    revalidatePath("/reports");
    revalidatePath("/accounting");
    return { error: null };
  }, () => demoDeleteSale(id));
}
