import { PageLoadingSkeleton } from "@/components/ui/PageLoading";

export default function Loading() {
  return <PageLoadingSkeleton titleWidth="8rem" stats={0} cards={2} />;
}
