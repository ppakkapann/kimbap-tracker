import { PageLoadingSkeleton } from "@/components/ui/PageLoading";

export default function Loading() {
  return <PageLoadingSkeleton stats={4} cards={2} />;
}
