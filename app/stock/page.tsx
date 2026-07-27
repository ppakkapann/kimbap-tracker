import { Suspense } from "react";
import { KimbapMark } from "@/components/brand/KimbapMark";
import { StockPageData, StockPageDataSkeleton } from "./StockPageData";

export default function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <div className="hidden md:block">
          <KimbapMark size={44} />
        </div>
        <div>
          <h1 className="app-title">สต็อก</h1>
          <p className="app-subtitle mt-1">สต็อกและวัตถุดิบ</p>
        </div>
      </div>

      <Suspense fallback={<StockPageDataSkeleton />}>
        <StockPageData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
