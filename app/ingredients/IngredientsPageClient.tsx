"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IngredientForm } from "@/components/ingredients/IngredientForm";
import { PurchaseForm } from "@/components/stock/PurchaseForm";
import { AppModal } from "@/components/ui";
import type { Ingredient } from "@/lib/types";

export function IngredientsPageClient({
  mode,
  ingredients,
  defaultIngredientId,
  compact = false,
  label: customLabel,
}: {
  mode: "add" | "purchase";
  ingredients: Ingredient[];
  defaultIngredientId?: string;
  compact?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  const label = customLabel ?? (mode === "add" ? "+ เพิ่ม" : "+ ซื้อเข้า");
  const btnClass = compact
    ? mode === "add"
      ? "app-btn app-btn-primary app-btn-sm shrink-0"
      : "app-btn app-btn-secondary app-btn-sm shrink-0"
    : mode === "add"
      ? "app-btn app-btn-primary"
      : "app-btn app-btn-secondary";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnClass}>
        {label}
      </button>
      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === "add" ? "เพิ่มวัตถุดิบ" : "เติมสต็อกและบันทึกการซื้อ"}
      >
        {mode === "add" ? (
          <IngredientForm ingredients={ingredients} onSuccess={handleSuccess} />
        ) : (
          <PurchaseForm
            ingredients={ingredients}
            defaultIngredientId={defaultIngredientId}
            onSuccess={handleSuccess}
          />
        )}
      </AppModal>
    </>
  );
}
