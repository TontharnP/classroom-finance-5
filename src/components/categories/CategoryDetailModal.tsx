"use client";
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Edit2, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAppStore } from "@/lib/store";
import { deleteCategory as deleteCategoryRemote, deleteCategoryIcon } from "@/lib/supabase/categories";
import type { Category } from "@/types";
import { EditCategoryModal } from "./EditCategoryModal";
import { EditTransactionModal } from "../transactions/EditTransactionModal";
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
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
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
  const editingTransaction = editingTransactionId
    ? data.transactions.find((transaction) => transaction.id === editingTransactionId)
    : null;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

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
  const isCustomImage = iconValue.startsWith("http");
  const IconComponent = getIconComponent(iconValue);

  const portalTarget = typeof document === "undefined" ? null : document.body;
  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-2xl"
            style={{ backdropFilter: "blur(16px) saturate(1.05)", WebkitBackdropFilter: "blur(16px) saturate(1.05)" }}
          />
          <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.42, bounce: 0.14 }}
              className="apple-panel flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden sm:max-h-[min(720px,calc(100dvh-2rem))]"
              onClick={(event) => event.stopPropagation()}
            >
            <div
              className="shrink-0 border-b px-4 py-4 sm:px-6"
              style={{
                borderColor: "var(--line)",
                background: "color-mix(in srgb, var(--panel-solid) 82%, transparent)",
                backdropFilter: "var(--blur-nav)",
              }}
            >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900 dark:to-blue-900">
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
                  className="apple-icon-button h-9 w-9 rounded-xl"
                  aria-label="แก้ไข"
                >
                  <Edit2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </button>
                <button
                  onClick={onClose}
                  className="apple-icon-button h-9 w-9 rounded-xl"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            </div>

            <div className="student-card-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="apple-soft rounded-xl p-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">จำนวนรายการ</p>
                <p className="text-2xl font-semibold">{categoryTransactions.length}</p>
              </div>
              <div className="apple-soft rounded-xl p-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">ยอดรวม</p>
                <p className={`text-2xl font-semibold ${totalAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {totalAmount >= 0 ? "+" : ""}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                </p>
              </div>
            </div>

            {/* Transactions List */}
            <div className="mb-4">
              <h3 className="mb-3 font-medium">รายการในหมวดหมู่นี้</h3>
              <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
                {categoryTransactions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">ยังไม่มีรายการในหมวดหมู่นี้</p>
                ) : (
                  categoryTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border p-2"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-zinc-500">
                          {format(new Date(t.createdAt), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        <p className={`font-semibold ${t.kind === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                          {t.kind === "income" ? "+" : "-"}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingTransactionId(t.id)}
                          className="apple-icon-button h-8 w-8 rounded-xl"
                          aria-label="แก้ไขรายการ"
                          title="แก้ไขรายการ"
                        >
                          <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Delete Section */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4" />
                ลบหมวดหมู่
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900 dark:bg-red-950/20">
                <p className="text-sm text-red-900 dark:text-red-200">
                  คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ <strong>{category.name}</strong>?
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
            </div>
            </motion.div>
          </div>

          {/* Edit Modal */}
          <EditCategoryModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            category={category}
          />
          {editingTransaction && (
            <EditTransactionModal
              isOpen={!!editingTransaction}
              onClose={() => setEditingTransactionId(null)}
              transaction={editingTransaction}
            />
          )}
        </>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
