"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";

export function ProductsPageClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSuccess(id: string) {
    setOpen(false);
    router.push(`/products/${id}`);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="app-btn app-btn-primary">
        + เพิ่มเมนู
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="app-section-title text-lg">เพิ่มเมนู</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-xl leading-none"
                style={{ color: "var(--text-muted)" }}
              >
                ×
              </button>
            </div>
            <ProductForm onSuccess={handleSuccess} />
          </div>
        </div>
      )}
    </>
  );
}
