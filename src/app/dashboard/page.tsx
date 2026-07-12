import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { StatCardSkeleton, ChartSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = { title: "แดชบอร์ด | ระบบการเงินห้องเรียน" };

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <CardSkeleton />
      <ChartSkeleton />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="fixed-page">
      <div className="fixed-page-header flex flex-col gap-1">
        <h1 className="section-title text-2xl sm:text-3xl md:text-4xl">ภาพรวม</h1>
        <p className="page-kicker">สรุปเงินห้อง กำหนดการ และการเก็บเงินในหน้าเดียว</p>
      </div>
      <div className="fixed-page-body">
        <ErrorBoundary>
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardOverview />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
