"use client";
import { useState } from "react";
import { X, Edit, Trash2, Check, XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { useAppStore } from "@/lib/store";
import { deleteSchedule as deleteScheduleRemote } from "@/lib/supabase/schedules";
import type { Schedule, Student } from "@/types";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EditScheduleModal } from "./EditScheduleModal";
import { QuickPayModal } from "../transactions/QuickPayModal";

type ScheduleDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule;
};

export function ScheduleDetailModal({ isOpen, onClose, schedule }: ScheduleDetailModalProps) {
  const data = useAppStore((state) => state.data);
  const deleteSchedule = useAppStore((state) => state.deleteSchedule);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [quickPayStudent, setQuickPayStudent] = useState<{ scheduleId: string; studentId: string } | null>(null);

  // Get students for this schedule
  const scheduleStudents = data.students
    .filter((s) => schedule.studentIds.includes(s.id))
    .sort((a, b) => a.number - b.number);

  // Get transactions for this schedule
  const scheduleTransactions = data.transactions.filter(
    (t) => t.source === "schedule" && t.scheduleId === schedule.id
  );

  // Aggregate per student for partial/multi method payments
  const perStudentTotals: Record<string, number> = {};
  for (const t of scheduleTransactions) {
    if (t.studentId) {
      perStudentTotals[t.studentId] = (perStudentTotals[t.studentId] || 0) + t.amount;
    }
  }

  const paidStudentIds = new Set(
    Object.entries(perStudentTotals)
      .filter(([studentId, total]) => total >= schedule.amountPerItem)
      .map(([studentId]) => studentId)
  );

  // Calculate stats
  const totalStudents = scheduleStudents.length;
  const paidCount = paidStudentIds.size;
  const unpaidCount = totalStudents - paidCount;
  const totalCollected = scheduleTransactions.reduce((sum, t) => sum + t.amount, 0);
  const targetAmount = schedule.amountPerItem * totalStudents;
  const daysLeft = schedule.endDate
    ? differenceInDays(new Date(schedule.endDate), new Date())
    : null;

  const handleDelete = async () => {
    try {
      await deleteScheduleRemote(schedule.id);
      deleteSchedule(schedule.id);
      toast.success("ลบกำหนดการสำเร็จ");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDeleteConfirm(null);
    }
  };

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
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{schedule.name}</h2>
                    <div className="mt-2 flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>เริ่ม: {format(new Date(schedule.startDate), "dd/MM/yyyy")}</span>
                      {schedule.endDate && (
                        <>
                          <span>•</span>
                          <span>สิ้นสุด: {format(new Date(schedule.endDate), "dd/MM/yyyy")}</span>
                        </>
                      )}
                      {daysLeft !== null && daysLeft >= 0 && (
                        <>
                          <span>•</span>
                          <span className="text-orange-600 dark:text-orange-400">
                            เหลือ {daysLeft} วัน
                          </span>
                        </>
                      )}
                    </div>
                    {schedule.details && (
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {schedule.details}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      aria-label="แก้ไข"
                    >
                      <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ id: schedule.id, name: schedule.name })}
                      className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      aria-label="ลบ"
                    >
                      <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
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
              </div>

              {/* Summary Cards */}
              <div className="border-b px-6 py-4 dark:border-zinc-800">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      จำนวนต่อรายการ
                    </div>
                    <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {schedule.amountPerItem.toLocaleString()} ฿
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/20">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      เก็บได้
                    </div>
                    <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {totalCollected.toLocaleString()} ฿
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {paidCount}/{totalStudents} คน
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      เป้าหมาย
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {targetAmount.toLocaleString()} ฿
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {unpaidCount} คนค้าง
                    </div>
                  </div>
                </div>
              </div>

              {/* Student List */}
              <div className="px-6 py-4">
                <h3 className="mb-3 font-medium">
                  รายชื่อนักเรียน ({scheduleStudents.length} คน)
                </h3>
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {scheduleStudents.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500">
                      ไม่มีนักเรียนในกำหนดการนี้
                    </div>
                  ) : (
                    scheduleStudents.map((student, idx) => {
                      const totalPaid = perStudentTotals[student.id] || 0;
                      const hasPaid = totalPaid >= schedule.amountPerItem;
                      const remain = Math.max(0, schedule.amountPerItem - totalPaid);
                      return (
                        <motion.div
                          key={student.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          onClick={() => {
                            if (!hasPaid) {
                              setQuickPayStudent({ scheduleId: schedule.id, studentId: student.id });
                            }
                          }}
                          className={`flex items-center justify-between rounded-lg border p-3 dark:border-zinc-800 ${
                            !hasPaid ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                hasPaid
                                  ? "bg-emerald-100 dark:bg-emerald-950/30"
                                  : "bg-rose-100 dark:bg-rose-950/30"
                              }`}
                            >
                              {hasPaid ? (
                                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <XIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {student.prefix} {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                เลขที่ {student.number} • {student.nickName}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {hasPaid ? (
                              <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">ชำระแล้ว</div>
                            ) : totalPaid > 0 ? (
                              <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                ชำระแล้ว {totalPaid.toLocaleString()} ฿
                                <div className="text-xs text-amber-600 dark:text-amber-400">ค้าง {remain.toLocaleString()} ฿</div>
                              </div>
                            ) : (
                              <div className="text-sm font-medium text-rose-600 dark:text-rose-400">คลิกเพื่อชำระ</div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Delete Confirmation */}
          <ConfirmDialog
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            title="ยืนยันการลบกำหนดการ"
            message={`คุณต้องการลบกำหนดการ "${deleteConfirm?.name}" ใช่หรือไม่?`}
            confirmText="ลบ"
            confirmVariant="danger"
            onConfirm={handleDelete}
          />

          {/* Edit Modal */}
          <EditScheduleModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            schedule={schedule}
          />

          {/* Quick Pay Modal */}
          {quickPayStudent && (
            <QuickPayModal
              isOpen={!!quickPayStudent}
              onClose={() => setQuickPayStudent(null)}
              scheduleId={quickPayStudent.scheduleId}
              studentId={quickPayStudent.studentId}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
