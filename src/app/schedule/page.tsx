import type { Metadata } from "next";
import { Suspense } from "react";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { ScheduleCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = { title: "กำหนดการ | ระบบการเงินห้องเรียน" };

function ScheduleViewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 overflow-x-auto pb-4">
        <ScheduleCardSkeleton />
        <ScheduleCardSkeleton />
        <ScheduleCardSkeleton />
      </div>
      <div className="apple-card p-4">
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

export default function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ scheduleId?: string; status?: string }>;
}) {
  return (
    <div className="fixed-page">
      <div className="fixed-page-header">
        <h1 className="section-title text-2xl sm:text-3xl md:text-4xl">กำหนดการ</h1>
        <p className="page-kicker">จัดกลุ่มการเก็บเงินตามโฟลเดอร์ วันที่ และสถานะการชำระ</p>
      </div>
      <div className="fixed-page-body">
        <ErrorBoundary>
          <Suspense fallback={<ScheduleViewSkeleton />}>
            <ScheduleView searchParamsPromise={searchParams} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
