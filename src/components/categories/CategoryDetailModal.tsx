"use client";
import { useState, useMemo } from "react";
import { X, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAppStore } from "@/lib/store";
import { deleteCategory as deleteCategoryRemote, deleteCategoryIcon } from "@/lib/supabase/categories";
import type { Category } from "@/types";
import { EditCategoryModal } from "./EditCategoryModal";
import { getIconComponent } from "./IconPicker";
import toast from "react-hot-toast";

type CategoryDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
};

export function CategoryDetailModal({ isOpen, onClose, category: initialCategory }: CategoryDetailModalProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const data = useAppStore((state) => state.data);
  const deleteCategory = useAppStore((state) => state.deleteCategory);
  
  // Always get fresh category data from store to reflect updates
  const category = useMemo(
    () => data.categories.find(c => c.id === initialCategory.id) || initialCategory,
    [data.categories, initialCategory]
  );

  // Get transactions that use this category
  const categoryTransactions = useMemo(
    () => data.transactions.filter((t) => t.category === category.name && t.source === "transaction"),
    [data.transactions, category.name]
  );

  const totalAmount = useMemo(
    () => categoryTransactions.reduce((sum, t) => {
      if (t.kind === "income") return sum + t.amount;
      return sum - t.amount;
    }, 0),
    [categoryTransactions]
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete custom image if exists
      if (category.icon?.startsWith("http")) {
        await deleteCategoryIcon(category.icon);
      }
      
      await deleteCategoryRemote(category.id);
      deleteCategory(category.id);
      toast.success("ลบหมวดหมู่เรียบร้อย");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("ลบหมวดหมู่ไม่สำเร็จ");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const iconValue = category.icon ?? "folder";
  const IconComponent = getIconComponent(iconValue);
  const isCustomImage = iconValue.startsWith("http");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 overflow-hidden">
                  {isCustomImage ? (
                    <img src={iconValue} alt={category.name} className="h-full w-full object-cover" />
                  ) : (
                    <IconComponent className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{category.name}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">หมวดหมู่</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="แก้ไข"
                >
                  <Edit2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">จำนวนรายการ</p>
                <p className="text-2xl font-semibold">{categoryTransactions.length}</p>
              </div>
              <div className="rounded-lg border p-4 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">ยอดรวม</p>
                <p className={`text-2xl font-semibold ${totalAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {totalAmount >= 0 ? "+" : ""}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                </p>
              </div>
            </div>

            {/* Transactions List */}
            <div className="mb-4">
              <h3 className="mb-3 font-medium">รายการในหมวดหมู่นี้</h3>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3 dark:border-zinc-800">
                {categoryTransactions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">ยังไม่มีรายการในหมวดหมู่นี้</p>
                ) : (
                  categoryTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-md border p-2 dark:border-zinc-800"
                    >
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-zinc-500">
                          {format(new Date(t.createdAt), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <p className={`font-semibold ${t.kind === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.kind === "income" ? "+" : "-"}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Delete Section */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4" />
                ลบหมวดหมู่
              </button>
            ) : (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
                <p className="text-sm text-red-900 dark:text-red-200">
                  คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "<strong>{category.name}</strong>"?
                  {categoryTransactions.length > 0 && (
                    <span className="block mt-1">หมวดหมู่นี้ถูกใช้ใน {categoryTransactions.length} รายการ</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Edit Modal */}
          <EditCategoryModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            category={category}
          />
        </>
      )}
    </AnimatePresence>
  );
}
