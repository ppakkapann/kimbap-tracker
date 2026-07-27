import Link from "next/link";
import { ProductDetailLayout } from "@/components/products/ProductDetailLayout";
import { ProductStatsRow } from "@/components/products/ProductStatsRow";
import { RecipeEditor } from "@/components/products/RecipeEditor";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import {
  getCostStatCardSub,
  getProductCostTargets,
  getSuggestedPriceCard,
} from "@/lib/food-cost";
import {
  fetchIngredients,
  fetchProduct,
  fetchProductsWithCost,
  fetchRecipeItems,
} from "@/lib/queries";
import { notFound } from "next/navigation";
import { ProductEditForm } from "./ProductEditForm";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) notFound();

  const [ingredients, recipeItems, productsWithCost] = await Promise.all([
    fetchIngredients(),
    fetchRecipeItems(id),
    fetchProductsWithCost(),
  ]);

  const withCost = productsWithCost.find((p) => p.id === id);
  const costPerRoll = withCost?.costPerRoll ?? 0;
  const profitPerRoll = withCost?.profitPerRoll ?? 0;
  const targets = getProductCostTargets(product);
  const costStatSub = getCostStatCardSub(
    costPerRoll,
    product.selling_price,
    targets.min,
    targets.max
  );
  const priceCard = getSuggestedPriceCard(
    costPerRoll,
    product.selling_price,
    targets.min,
    targets.max
  );

  return (
    <div>
      <PageHeader title={product.name} subtitle="แก้ไขเมนูและสูตร" />

      <ProductDetailLayout
        stats={
          <ProductStatsRow
            sellingPrice={product.selling_price}
            profitPerRoll={profitPerRoll}
            costPerRoll={costPerRoll}
            costStatSub={costStatSub}
            priceCard={priceCard}
            targetMin={targets.min}
            targetMax={targets.max}
          />
        }
        menu={
          <Card className="product-menu-card">
            <SectionTitle
              title="ข้อมูลเมนู"
              description={product.is_active ? "เปิดขาย" : "ปิดขาย"}
            />
            <ProductEditForm product={product} />
          </Card>
        }
        recipe={
          <Card className="history-panel-card product-recipe-panel-card">
            <RecipeEditor
              productId={id}
              ingredients={ingredients}
              existingItems={recipeItems}
            />
          </Card>
        }
      />

      <Link href="/products" className="app-link mt-6 inline-block">
        ← กลับรายการเมนู
      </Link>
    </div>
  );
}
