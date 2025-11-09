"use client";
import { useState, useMemo } from "react";
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Add Category Card */}
        <motion.button
          onClick={() => setIsAddModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-blue-600 dark:hover:bg-blue-950/20"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Plus className="h-6 w-6 text-blue-600 dark:text-blue-300" />
          </div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">เพิ่มหมวดหมู่</span>
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
  const IconComponent = getIconComponent(iconValue);
  const isCustomImage = iconValue.startsWith("http");

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 group-hover:from-blue-200 group-hover:to-purple-200 dark:from-blue-900 dark:to-purple-900 overflow-hidden">
        {isCustomImage ? (
          <img src={category.icon as string} alt={category.name} className="h-full w-full object-cover" />
        ) : (
          <IconComponent className="h-7 w-7 text-blue-600 dark:text-blue-300" />
        )}
      </div>
      
      <div className="text-center">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{category.name}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{transactions.length} รายการ</p>
        {transactions.length > 0 && (
          <p className={`mt-1 text-sm font-medium ${totalAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {totalAmount >= 0 ? "+" : ""}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
          </p>
        )}
      </div>
    </motion.button>
  );
}
