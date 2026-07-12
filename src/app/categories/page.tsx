import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoriesGrid } from "@/components/categories/CategoriesGrid";

export const metadata: Metadata = { title: "หมวดหมู่ | ระบบการเงินห้องเรียน" };

export default function CategoriesPage() {
  return (
    <div className="fixed-page">
      <div className="fixed-page-header">
        <h1 className="section-title text-2xl sm:text-3xl md:text-4xl">หมวดหมู่</h1>
        <p className="page-kicker">จัดการหมวดหมู่รายการทั้งหมดด้วยไอคอนและสีที่ชัดเจน</p>
      </div>
      
      <div className="fixed-page-body">
        <Suspense fallback={<LoadingGrid />}>
          <CategoriesGrid />
        </Suspense>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="apple-card h-40 animate-pulse"
        />
      ))}
    </div>
  );
}
