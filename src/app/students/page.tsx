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
    <div className="page-stack">
      <div>
        <h1 className="section-title text-2xl sm:text-3xl md:text-4xl">Students</h1>
        <p className="page-kicker">Student profiles, avatars, and payment readiness at a glance.</p>
      </div>
      <ErrorBoundary>
        <Suspense fallback={<StudentsGridSkeleton />}>
          <StudentsGrid />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
