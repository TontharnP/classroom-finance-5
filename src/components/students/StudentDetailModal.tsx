"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Edit2, Trash2, ImageOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";
import { getFolderPath, getSchedulesInSystemOrder } from "@/lib/schedules/grouping";
import type { Student } from "@/types";
import { EditStudentModal } from "./EditStudentModal";
import { QuickPayModal } from "../transactions/QuickPayModal";
import {
  deleteStudent as deleteStudentRemote,
  deleteStudentAvatar,
  updateStudent as updateStudentRemote,
} from "@/lib/supabase/students";
import { dbStudentToStudent } from "@/lib/supabase/adapter";

type StudentDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
};

type TabType = "paid" | "unpaid";

export function StudentDetailModal({ isOpen, onClose, student: initialStudent }: StudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("unpaid");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [quickPayScheduleId, setQuickPayScheduleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [mounted, setMounted] = useState(false);
  const data = useAppStore((state) => state.data);
  const deleteStudent = useAppStore((state) => state.deleteStudent);
  const updateStudent = useAppStore((state) => state.updateStudent);
  
  // Always get fresh student data from store to reflect updates
  const student = data.students.find(s => s.id === initialStudent.id) || initialStudent;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleDelete = async () => {
    const relatedTransactions = data.transactions.filter(t => t.studentId === student.id);
    const hasTransactions = relatedTransactions.length > 0;
    
    const confirmMessage = hasTransactions
      ? `คุณแน่ใจหรือไม่ที่จะลบนักเรียน ${student.firstName} ${student.lastName}?\n\nรายการธุรกรรมที่เกี่ยวข้อง ${relatedTransactions.length} รายการจะถูกลบด้วย\n\nการลบจะเป็นการถาวรและไม่สามารถกู้คืนได้`
      : `คุณแน่ใจหรือไม่ที่จะลบนักเรียน ${student.firstName} ${student.lastName}?\n\nการลบจะเป็นการถาวรและไม่สามารถกู้คืนได้`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteStudentRemote(student.id);
      // Delete related transactions from store
      relatedTransactions.forEach(t => {
        useAppStore.getState().deleteTransaction(t.id);
      });
      // Delete student from store
      deleteStudent(student.id);
      toast.success("ลบนักเรียนสำเร็จ");
      onClose();
    } catch (error: unknown) {
      console.error("Error deleting student:", error);
      toast.error(error instanceof Error ? error.message : "ไม่สามารถลบนักเรียนได้");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!student.avatarUrl) return;
    if (!confirm("ลบรูปโปรไฟล์ของนักเรียนคนนี้หรือไม่?")) return;

    setIsDeletingAvatar(true);
    try {
      await deleteStudentAvatar(student.avatarUrl).catch((error) => {
        console.warn("Failed to delete student avatar from Blob storage:", error);
      });
      const remoteUpdated = await updateStudentRemote(student.id, {
        avatar_url: null,
      });
      updateStudent(student.id, dbStudentToStudent(remoteUpdated));
      toast.success("ลบรูปโปรไฟล์สำเร็จ");
    } catch (error: unknown) {
      console.error("Error deleting student avatar:", error);
      toast.error(error instanceof Error ? error.message : "ไม่สามารถลบรูปโปรไฟล์ได้");
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  // Calculate payment summary (partial payments remain unpaid until full)
  const studentTransactions = data.transactions.filter(
    (t) => t.studentId === student.id && t.source === "schedule"
  );

  // Aggregate paid amount per schedule for this student
  const perSchedulePaid: Record<string, number> = {};
  for (const t of studentTransactions) {
    if (!t.scheduleId) continue;
    perSchedulePaid[t.scheduleId] = (perSchedulePaid[t.scheduleId] || 0) + t.amount;
  }

  // Get all schedules that include this student
  const orderedSchedules = getSchedulesInSystemOrder(data);
  const studentSchedules = orderedSchedules.filter((sch) => sch.studentIds.includes(student.id));

  // Unpaid = schedules where paid amount < required
  const unpaidSchedules = studentSchedules.filter(
    (sch) => (perSchedulePaid[sch.id] || 0) < sch.amountPerItem
  );

  // Sum of remaining for unpaid schedules
  const totalUnpaid = unpaidSchedules.reduce(
    (sum, sch) => sum + Math.max(0, sch.amountPerItem - (perSchedulePaid[sch.id] || 0)),
    0
  );

  // Display total paid as capped at schedule amount to avoid overcounting
  const totalPaid = studentSchedules.reduce(
    (sum, sch) => sum + Math.min(sch.amountPerItem, perSchedulePaid[sch.id] || 0),
    0
  );

  // Paid transactions
  const paidTransactions = studentTransactions.map((t) => {
    const schedule = data.schedules.find((s) => s.id === t.scheduleId);
    return {
      id: t.id,
      name: schedule?.name || t.name,
      amount: t.amount,
      method: t.method,
      date: t.createdAt,
    };
  });

  // Unpaid schedules
  const unpaidItems = unpaidSchedules.map((sch) => ({
    id: sch.id,
    name: sch.name,
    folderPath: getFolderPath(sch.folderId, data.scheduleFolders),
    amount: Math.max(0, sch.amountPerItem - (perSchedulePaid[sch.id] || 0)),
    dueDate: sch.endDate || null,
  }));

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-2xl"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="apple-panel relative flex max-h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-3xl flex-col overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Header */}
              <div
                className="sticky top-0 z-10 shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4"
                style={{
                  borderColor: "var(--line)",
                  background: "color-mix(in srgb, var(--panel-solid) 82%, transparent)",
                  backdropFilter: "var(--blur-nav)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3 sm:gap-4">
                    {/* Avatar */}
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 sm:h-16 sm:w-16">
                      {student.avatarUrl ? (
                        <img
                          src={student.avatarUrl}
                          alt={student.firstName}
                          className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16"
                        />
                      ) : (
                        <User className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold sm:text-xl">
                        {student.prefix} {student.firstName} {student.lastName}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {student.nickName && <span>ชื่อเล่น: {student.nickName}</span>}
                        {student.nickName && <span>•</span>}
                        <span>เลขที่: {student.number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 gap-1 sm:gap-2">
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="apple-icon-button h-9 w-9 rounded-xl"
                      aria-label="แก้ไข"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    {student.avatarUrl && (
                      <button
                        onClick={handleDeleteAvatar}
                        disabled={isDeletingAvatar}
                        className="apple-icon-button h-9 w-9 rounded-xl disabled:opacity-50"
                        aria-label="ลบรูปโปรไฟล์"
                        title="ลบรูปโปรไฟล์"
                      >
                        <ImageOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="apple-icon-button h-9 w-9 rounded-xl disabled:opacity-50"
                      aria-label="ลบนักเรียน"
                      title="ลบนักเรียน"
                    >
                      <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </button>
                    <button
                      onClick={onClose}
                      className="apple-icon-button h-9 w-9 rounded-xl"
                      aria-label="ปิด"
                      title="ปิด"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Payment Summary */}
              <div className="border-b px-4 py-4 sm:px-6" style={{ borderColor: "var(--line)" }}>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      ยอดเงินที่ชำระ
                    </div>
                    <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {totalPaid.toLocaleString()} ฿
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {paidTransactions.length} รายการ
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-200/60 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-950/20">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      ยอดเงินที่ค้าง
                    </div>
                    <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
                      {totalUnpaid.toLocaleString()} ฿
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {unpaidItems.length} รายการ
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b px-4 sm:px-6" style={{ borderColor: "var(--line)" }}>
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab("unpaid")}
                    className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "unpaid"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    รายการค้างชำระ ({unpaidItems.length})
                    {activeTab === "unpaid" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                      />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("paid")}
                    className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "paid"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    รายการที่ชำระแล้ว ({paidTransactions.length})
                    {activeTab === "paid" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-4 sm:px-6">
                {activeTab === "unpaid" && (
                  <div className="space-y-2">
                    {unpaidItems.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500">
                        ไม่มีรายการค้างชำระ
                      </div>
                    ) : (
                      unpaidItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-white/60 dark:hover:bg-zinc-800/50"
                          style={{ borderColor: "var(--line)" }}
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {item.folderPath && <span>{item.folderPath}</span>}
                              {item.dueDate && (
                                <span className={item.folderPath ? "ml-2" : ""}>
                                  ครบกำหนด: {format(new Date(item.dueDate), "dd/MM/yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-lg font-semibold text-rose-600 dark:text-rose-400">
                              {item.amount.toLocaleString()} ฿
                            </div>
                            <button
                              className="apple-button opacity-0 px-4 py-2 text-sm group-hover:opacity-100"
                              onClick={() => {
                                setQuickPayScheduleId(item.id);
                              }}
                            >
                              ชำระ
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "paid" && (
                  <div className="space-y-2">
                    {paidTransactions.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500">
                        ยังไม่มีรายการชำระ
                      </div>
                    ) : (
                      paidTransactions.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between rounded-xl border p-4"
                          style={{ borderColor: "var(--line)" }}
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="mt-1 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                              <span>{format(new Date(item.date), "dd/MM/yyyy HH:mm")}</span>
                              {item.method && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{item.method}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                            {item.amount.toLocaleString()} ฿
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}
              </div>
              </div>
            </motion.div>
          </div>

          {/* Edit Modal */}
          <EditStudentModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            student={student}
          />
          {quickPayScheduleId && (
            <QuickPayModal
              isOpen={!!quickPayScheduleId}
              onClose={() => setQuickPayScheduleId(null)}
              scheduleId={quickPayScheduleId}
              studentId={student.id}
            />
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
