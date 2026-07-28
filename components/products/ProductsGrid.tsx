import { PageLoadingSkeleton } from "@/components/ui/PageLoading";
import { ProductsGridView } from "@/components/products/ProductsGridView";
import { fetchProductsWithCost } from "@/lib/queries";

export function ProductsGridSkeleton() {
  return <PageLoadingSkeleton titleWidth="0" stats={0} cards={3} />;
}

export async function ProductsGrid() {
  const products = await fetchProductsWithCost();

  if (products.length === 0) {
    return (
      <div className="app-empty">
        <p className="mb-4">ยังไม่มีเมนู</p>
      </div>
    );
  }

  return <ProductsGridView products={products} />;
}
