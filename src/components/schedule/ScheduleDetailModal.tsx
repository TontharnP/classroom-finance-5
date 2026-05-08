"use client";
import { useState, useMemo } from "react";
import { X, Edit, Trash2, Check, XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { useAppStore } from "@/lib/store";
import { deleteSchedule as deleteScheduleRemote } from "@/lib/supabase/schedules";
import type { Schedule } from "@/types";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EditScheduleModal } from "./EditScheduleModal";
import { QuickPayModal } from "../transactions/QuickPayModal";

type ScheduleDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule;
  initialStatusFilter?: "paid" | "unpaid";
};

export function ScheduleDetailModal({ isOpen, onClose, schedule, initialStatusFilter }: ScheduleDetailModalProps) {
  const data = useAppStore((state) => state.data);
  const deleteSchedule = useAppStore((state) => state.deleteSchedule);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [quickPayStudent, setQuickPayStudent] = useState<{ scheduleId: string; studentId: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(initialStatusFilter || "all");

  // Get students for this schedule
  const scheduleStudents = data.students
    .filter((s) => schedule.studentIds.includes(s.id))
    .sort((a, b) => a.number - b.number);

  // Get transactions for this schedule
  const scheduleTransactions = useMemo(
    () => data.transactions.filter((t) => t.source === "schedule" && t.scheduleId === schedule.id),
    [data.transactions, schedule.id]
  );

  // Aggregate per student for partial/multi method payments
  const perStudentTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const t of scheduleTransactions) {
      if (t.studentId) {
        totals[t.studentId] = (totals[t.studentId] || 0) + t.amount;
      }
    }
    return totals;
  }, [scheduleTransactions]);

  const paidStudentIds = useMemo(
    () =>
      new Set(
        Object.entries(perStudentTotals)
          .filter(([, total]) => total >= schedule.amountPerItem)
          .map(([studentId]) => studentId)
      ),
    [perStudentTotals, schedule.amountPerItem]
  );

  // Filter students based on status filter
  const filteredStudents = useMemo(() => {
    if (statusFilter === "all") return scheduleStudents;
    if (statusFilter === "paid") return scheduleStudents.filter(s => paidStudentIds.has(s.id));
    return scheduleStudents.filter(s => !paidStudentIds.has(s.id));
  }, [scheduleStudents, statusFilter, paidStudentIds]);

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
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-2xl"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="apple-panel relative flex max-h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-3xl flex-col overflow-hidden"
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
                      className="apple-icon-button h-9 w-9 rounded-xl"
                      aria-label="แก้ไข"
                    >
                      <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ id: schedule.id, name: schedule.name })}
                      className="apple-icon-button h-9 w-9 rounded-xl"
                      aria-label="ลบ"
                    >
                      <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
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

              <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Summary Cards */}
              <div className="border-b px-4 py-4 sm:px-6" style={{ borderColor: "var(--line)" }}>
                <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="rounded-xl border border-blue-200/60 bg-blue-50/80 p-4 dark:border-blue-500/20 dark:bg-blue-950/20">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      จำนวนต่อรายการ
                    </div>
                    <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {schedule.amountPerItem.toLocaleString()} ฿
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/20">
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

                  <div className="apple-soft rounded-xl p-4">
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
              <div className="px-4 py-4 sm:px-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">
                    รายชื่อนักเรียน ({filteredStudents.length}/{scheduleStudents.length} คน)
                  </h3>
                  <div className="flex gap-1">
                    {[
                      { key: "all", label: "ทั้งหมด" },
                      { key: "paid", label: "ชำระแล้ว" },
                      { key: "unpaid", label: "ค้างชำระ" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                        className={`rounded-full px-3 py-1 text-xs transition-colors ${statusFilter === tab.key
                            ? "bg-blue-600 text-white"
                            : "bg-white/60 hover:bg-white dark:bg-zinc-800/70 dark:hover:bg-zinc-700"
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {filteredStudents.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500">
                      {statusFilter === "all" ? "ไม่มีนักเรียนในกำหนดการนี้" : statusFilter === "paid" ? "ยังไม่มีนักเรียนที่ชำระแล้ว" : "ไม่มีนักเรียนค้างชำระ"}
                    </div>
                  ) : (
                    filteredStudents.map((student, idx) => {

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
                          className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${!hasPaid ? "cursor-pointer hover:bg-blue-50/80 dark:hover:bg-blue-950/20" : ""
                            }`}
                          style={{ borderColor: "var(--line)" }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${hasPaid
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
