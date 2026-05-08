"use client";
import { createElement, useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { Category } from "@/types";
import { CategoryDetailModal } from "./CategoryDetailModal";
import { AddCategoryModal } from "./AddCategoryModal";
import { getIconComponent } from "./IconPicker";

export function CategoriesGrid() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const categories = useAppStore((state) => state.data.categories);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {/* Add Category Card */}
        <motion.button
          onClick={() => setIsAddModalOpen(true)}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          className="apple-card flex min-h-36 flex-col items-center justify-center gap-3 border-2 border-dashed p-4 hover:shadow-xl sm:min-h-40"
        >
          <div className="visual-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white">
            <Plus className="h-6 w-6" />
          </div>
          <span className="font-medium text-muted">เพิ่มหมวดหมู่</span>
        </motion.button>

        {/* Category Cards */}
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
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
  onClick: () => void;
};

function CategoryCard({ category, onClick }: CategoryCardProps) {
  const allTransactions = useAppStore((state) => state.data.transactions);

  const transactions = useMemo(
    () => allTransactions.filter((t) => t.category === category.name && t.source === "transaction"),
    [allTransactions, category.name]
  );

  const totalAmount = useMemo(
    () =>
      transactions.reduce((sum, t) => {
        if (t.kind === "income") return sum + t.amount;
        return sum - t.amount;
      }, 0),
    [transactions]
  );

  const iconValue = category.icon ?? "tmpl:folder";
  const isCustomImage = iconValue.startsWith("http");
  const iconElement = createElement(getIconComponent(iconValue), {
    className: "h-7 w-7 text-[var(--primary)]",
  });

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="apple-card group relative flex min-h-36 min-w-0 flex-col items-center justify-center gap-3 p-4 transition-shadow hover:shadow-xl sm:min-h-40"
    >
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl" style={{ background: "var(--primary-soft)" }}>
        {isCustomImage ? (
          <img src={category.icon as string} alt={category.name} className="h-full w-full object-cover" />
        ) : (
          iconElement
        )}
      </div>
      
      <div className="text-center">
        <h3 className="max-w-full truncate font-semibold" title={category.name}>{category.name}</h3>
        <p className="text-xs text-muted">{transactions.length} รายการ</p>
        {transactions.length > 0 && (
          <p className={`mt-1 text-sm font-medium ${totalAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {totalAmount >= 0 ? "+" : ""}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
          </p>
        )}
      </div>
    </motion.button>
  );
}
