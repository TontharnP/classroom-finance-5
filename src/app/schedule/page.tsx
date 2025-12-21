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
      <div className="rounded-xl border p-4">
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
      <ErrorBoundary>
        <Suspense fallback={<ScheduleViewSkeleton />}>
          <ScheduleView />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
