import Link from "next/link";
import { Suspense } from "react";
import {
  DashboardContent,
  DashboardContentSkeleton,
} from "@/components/dashboard/DashboardContent";
import { Download, Plus } from "lucide-react";

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="app-title">ภาพรวมร้าน</h1>
          <p className="app-subtitle mt-1">
            วันนี้ขายเป็นอย่างไร และมีเรื่องไหนต้องจัดการตอนนี้
          </p>
        </div>
        <div className="flex gap-2 sm:self-start">
          <Link href="/reports" className="app-btn app-btn-secondary">
            <Download size={13} /> ดูรายงาน
          </Link>
          <Link href="/sales" className="app-btn app-btn-primary">
            <Plus size={13} /> บันทึกยอดขาย
          </Link>
        </div>
      </div>

      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
