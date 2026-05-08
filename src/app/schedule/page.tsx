import { Suspense } from "react";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { ScheduleCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
    <div className="page-stack">
      <div>
        <h1 className="section-title text-2xl sm:text-3xl md:text-4xl">Schedule</h1>
        <p className="page-kicker">Organize collections by folder, date, and payment status.</p>
      </div>
      <ErrorBoundary>
        <Suspense fallback={<ScheduleViewSkeleton />}>
          <ScheduleView searchParamsPromise={searchParams} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
