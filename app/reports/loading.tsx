import { PageLoadingSkeleton } from "@/components/ui/PageLoading";

export default function Loading() {
  return <PageLoadingSkeleton titleWidth="6rem" stats={3} cards={1} />;
}
