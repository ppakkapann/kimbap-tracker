"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { AppModal } from "@/components/ui";

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
      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="เพิ่มเมนู"
      >
        <ProductForm onSuccess={handleSuccess} />
      </AppModal>
    </>
  );
}
