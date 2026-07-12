"use client";
import { createElement, useState, useMemo, memo } from "react";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Category, Transaction } from "@/types";
import { CategoryDetailModal } from "./CategoryDetailModal";
import { AddCategoryModal } from "./AddCategoryModal";
import { getIconComponent } from "./IconPicker";

type CategoryStats = { count: number; total: number };
const emptyStats: CategoryStats = { count: 0, total: 0 };

export function CategoriesGrid() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const categories = useAppStore((state) => state.data.categories);
  const transactions = useAppStore((state) => state.data.transactions);

  const statsByCategory = useMemo(() => {
    const result: Record<string, CategoryStats> = {};
    for (const t of transactions as Transaction[]) {
      if (t.source !== "transaction" || !t.category) continue;
      const stats = (result[t.category] ||= { count: 0, total: 0 });
      stats.count += 1;
      stats.total += t.kind === "income" ? t.amount : -t.amount;
    }
    return result;
  }, [transactions]);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-4">
        {/* Add Category Card */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="apple-card hover-lift pressable flex min-h-32 flex-col items-center justify-center gap-2 border-2 border-dashed p-3 hover:shadow-xl sm:min-h-40 sm:gap-3 sm:p-4"
        >
          <div className="visual-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white">
            <Plus className="h-6 w-6" />
          </div>
          <span className="font-medium text-muted">เพิ่มหมวดหมู่</span>
        </button>

        {/* Category Cards */}
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            stats={statsByCategory[category.name] || emptyStats}
            onClick={() => setSelectedCategory(category)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {selectedCategory && (
        <CategoryDetailModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          category={selectedCategory}
        />
      )}

      {/* Add Modal */}
      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
}

type CategoryCardProps = {
  category: Category;
  stats: CategoryStats;
  onClick: () => void;
};

const CategoryCard = memo(function CategoryCard({ category, stats, onClick }: CategoryCardProps) {
  const iconValue = category.icon ?? "tmpl:folder";
  const isCustomImage = iconValue.startsWith("http");
  const iconElement = createElement(getIconComponent(iconValue), {
    className: "h-7 w-7 text-[var(--primary)]",
  });

  return (
    <button
      onClick={onClick}
      className="apple-card hover-lift pressable group relative flex min-h-32 min-w-0 flex-col items-center justify-center gap-2 p-3 transition-shadow hover:shadow-xl sm:min-h-40 sm:gap-3 sm:p-4"
    >
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl sm:h-14 sm:w-14" style={{ background: "var(--primary-soft)" }}>
        {isCustomImage ? (
          <img src={category.icon as string} alt={category.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          iconElement
        )}
      </div>

      <div className="text-center">
        <h3 className="max-w-full truncate font-semibold" title={category.name}>{category.name}</h3>
        <p className="text-xs text-muted">{stats.count} รายการ</p>
        {stats.count > 0 && (
          <p className={`mt-1 text-sm font-medium ${stats.total >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {stats.total >= 0 ? "+" : ""}{stats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
          </p>
        )}
      </div>
    </button>
  );
});
