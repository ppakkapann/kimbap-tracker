import { Suspense } from "react";
import { ProductsPageClient } from "./ProductsPageClient";
import { PageHeader } from "@/components/ui";
import { ProductsGrid, ProductsGridSkeleton } from "@/components/products/ProductsGrid";

export default function ProductsPage() {
  return (
    <div>
      <PageHeader
        title="เมนูอาหาร"
        subtitle="ต้นทุนและกำไรต่อม้วน"
        action={<ProductsPageClient />}
      />

      <Suspense fallback={<ProductsGridSkeleton />}>
        <ProductsGrid />
      </Suspense>
    </div>
  );
}
