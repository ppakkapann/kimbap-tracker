import { redirect } from "next/navigation";

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  if (q?.trim()) {
    redirect(`/stock?q=${encodeURIComponent(q.trim())}`);
  }
  redirect("/stock");
}
