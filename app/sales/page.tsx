import { Suspense } from "react";
import {
  SalesPageContent,
  SalesPageSkeleton,
} from "@/components/sales/SalesPageContent";
import { PageHeader } from "@/components/ui";

export default function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return (
    <div>
      <PageHeader title="ยอดขาย" subtitle="บันทึกและดูยอดขายรายวัน" />
      <Suspense fallback={<SalesPageSkeleton />}>
        <SalesPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
