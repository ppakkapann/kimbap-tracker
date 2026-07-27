import { redirect } from "next/navigation";
import { fetchIngredient } from "@/lib/queries";

export default async function IngredientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ingredient = await fetchIngredient(id);
  if (!ingredient) {
    redirect("/stock");
  }
  redirect(`/stock?q=${encodeURIComponent(ingredient.name)}`);
}
