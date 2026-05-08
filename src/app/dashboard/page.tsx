import { Suspense } from "react";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { StatCardSkeleton, ChartSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
    <div className="page-stack">
      <div className="flex flex-col gap-1">
        <h1 className="section-title text-2xl sm:text-3xl md:text-4xl">Analytics</h1>
        <p className="page-kicker">A clean overview of classroom money, schedules, and collections.</p>
      </div>
      <ErrorBoundary>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardOverview />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
