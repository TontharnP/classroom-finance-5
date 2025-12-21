import { Suspense } from "react";
import { CategoriesGrid } from "@/components/categories/CategoriesGrid";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">หมวดหมู่</h1>
        <p className="text-zinc-600 dark:text-zinc-400">จัดการหมวดหมู่รายการทั้งหมด</p>
      </div>
      
      <Suspense fallback={<LoadingGrid />}>
        <CategoriesGrid />
      </Suspense>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}
