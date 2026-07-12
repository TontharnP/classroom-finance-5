import type { Metadata } from "next";
import { Suspense } from "react";
import { StudentsGrid } from "@/components/students/StudentsGrid";
import { StudentCardSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = { title: "นักเรียน | ระบบการเงินห้องเรียน" };

function StudentsGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
    <div className="fixed-page">
      <div className="fixed-page-header">
        <h1 className="section-title text-2xl sm:text-3xl md:text-4xl">นักเรียน</h1>
        <p className="page-kicker">ข้อมูลนักเรียน รูปโปรไฟล์ และสถานะการชำระเงิน</p>
      </div>
      <div className="fixed-page-body">
        <ErrorBoundary>
          <Suspense fallback={<StudentsGridSkeleton />}>
            <StudentsGrid />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
