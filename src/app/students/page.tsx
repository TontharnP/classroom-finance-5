import { Suspense } from "react";
import { StudentsGrid } from "@/components/students/StudentsGrid";
import { StudentCardSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function StudentsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StudentCardSkeleton />
      <StudentCardSkeleton />
      <StudentCardSkeleton />
      <StudentCardSkeleton />
      <StudentCardSkeleton />
      <StudentCardSkeleton />
    </div>
  );
}

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
      <ErrorBoundary>
        <Suspense fallback={<StudentsGridSkeleton />}>
          <StudentsGrid />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
