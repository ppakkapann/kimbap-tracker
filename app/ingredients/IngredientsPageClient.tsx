"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IngredientForm } from "@/components/ingredients/IngredientForm";
import { PurchaseForm } from "@/components/stock/PurchaseForm";
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
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="app-section-title text-lg">
                {mode === "add" ? "เพิ่มวัตถุดิบ" : "เติมสต็อกและบันทึกการซื้อ"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-xl leading-none"
                style={{ color: "var(--text-muted)" }}
              >
                ×
              </button>
            </div>
            {mode === "add" ? (
              <IngredientForm ingredients={ingredients} onSuccess={handleSuccess} />
            ) : (
              <PurchaseForm
                ingredients={ingredients}
                defaultIngredientId={defaultIngredientId}
                onSuccess={handleSuccess}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
