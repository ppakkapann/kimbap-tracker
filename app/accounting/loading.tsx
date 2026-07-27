import { PageLoadingSkeleton } from "@/components/ui/PageLoading";

export default function Loading() {
  return <PageLoadingSkeleton titleWidth="7rem" stats={4} cards={1} />;
}
