"use client";
import { useState } from "react";
import { X, User, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";
import type { Student } from "@/types";
import { EditStudentModal } from "./EditStudentModal";
import { QuickPayModal } from "../transactions/QuickPayModal";
import { deleteStudent as deleteStudentRemote } from "@/lib/supabase/students";

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
  const data = useAppStore((state) => state.data);
  const deleteStudent = useAppStore((state) => state.deleteStudent);
  
  // Always get fresh student data from store to reflect updates
  const student = data.students.find(s => s.id === initialStudent.id) || initialStudent;

  const handleDelete = async () => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบนักเรียน ${student.firstName} ${student.lastName}?\n\nการลบจะเป็นการถาวรและไม่สามารถกู้คืนได้`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteStudentRemote(student.id);
      deleteStudent(student.id);
      toast.success("ลบนักเรียนสำเร็จ");
      onClose();
    } catch (error: any) {
      console.error("Error deleting student:", error);
      toast.error(error.message || "ไม่สามารถลบนักเรียนได้");
    } finally {
      setIsDeleting(false);
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
  const studentSchedules = data.schedules.filter((sch) => sch.studentIds.includes(student.id));

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
    amount: Math.max(0, sch.amountPerItem - (perSchedulePaid[sch.id] || 0)),
    dueDate: sch.endDate || null,
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-zinc-900"
            >
              {/* Header */}
              <div className="border-b px-6 py-4 dark:border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
                      {student.avatarUrl ? (
                        <img
                          src={student.avatarUrl}
                          alt={student.firstName}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div>
                      <h2 className="text-xl font-semibold">
                        {student.prefix} {student.firstName} {student.lastName}
                      </h2>
                      <div className="mt-1 flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                        <span>ชื่อเล่น: {student.nickName}</span>
                        <span>•</span>
                        <span>เลขที่: {student.number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      aria-label="แก้ไข"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="rounded-lg p-2 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50"
                      aria-label="ลบนักเรียน"
                      title="ลบนักเรียน"
                    >
                      <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </button>
                    <button
                      onClick={onClose}
                      className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      aria-label="ปิด"
                      title="ปิด"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="border-b px-6 py-4 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/20">
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

                  <div className="rounded-lg bg-rose-50 p-4 dark:bg-rose-950/20">
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
              <div className="border-b px-6 dark:border-zinc-800">
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
              <div className="max-h-[400px] overflow-y-auto px-6 py-4">
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
                          className="group flex items-center justify-between rounded-lg border p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {item.dueDate && (
                                <span>
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
                              className="opacity-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 group-hover:opacity-100 transition-opacity"
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
                          className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-800"
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
    </AnimatePresence>
  );
}
