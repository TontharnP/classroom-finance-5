"use client";
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Edit, Trash2, Check, XIcon, Bell, MessageCircleWarning, ReceiptText, ExternalLink, Wallet, BadgeCheck, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { useAppStore } from "@/lib/store";
import { deleteSchedule as deleteScheduleRemote } from "@/lib/supabase/schedules";
import { sendScheduleLineAnnouncement, sendScheduleLineReminders } from "@/lib/supabase/schedules";
import { approveLinePaymentRequest, getLinePaymentRequests, updateLinePaymentRequest } from "@/lib/supabase/linePaymentRequests";
import { dbTransactionToTransaction, dbLinePaymentRequestToLinePaymentRequest } from "@/lib/supabase/adapter";
import type { LinePaymentRequest, Schedule } from "@/types";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EditScheduleModal } from "./EditScheduleModal";
import { QuickPayModal } from "../transactions/QuickPayModal";
import { TransactionSlipButton } from "../transactions/TransactionSlipButton";

type ScheduleDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule;
  initialStatusFilter?: "paid" | "unpaid";
};

export function ScheduleDetailModal({ isOpen, onClose, schedule, initialStatusFilter }: ScheduleDetailModalProps) {
  const data = useAppStore((state) => state.data);
  const deleteSchedule = useAppStore((state) => state.deleteSchedule);
  const addTransaction = useAppStore((state) => state.addTransaction);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [quickPayStudent, setQuickPayStudent] = useState<{ scheduleId: string; studentId: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(initialStatusFilter || "all");
  const [sendingReminder, setSendingReminder] = useState<"all" | string | null>(null);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [lineRequests, setLineRequests] = useState<LinePaymentRequest[]>([]);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);

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
  const latestTransactionByStudent = useMemo(() => {
    const latest = new Map<string, (typeof scheduleTransactions)[number]>();
    for (const transaction of scheduleTransactions) {
      if (!transaction.studentId) continue;
      const current = latest.get(transaction.studentId);
      if (!current || new Date(transaction.createdAt).getTime() > new Date(current.createdAt).getTime()) {
        latest.set(transaction.studentId, transaction);
      }
    }
    return latest;
  }, [scheduleTransactions]);

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
  const totalRemaining = Math.max(0, targetAmount - totalCollected);
  const unpaidStudents = scheduleStudents.filter((student) => !paidStudentIds.has(student.id));
  const unpaidStudentsWithLine = unpaidStudents.filter((student) => Boolean(student.lineUserId));
  const missingLineCount = unpaidStudents.length - unpaidStudentsWithLine.length;
  const daysLeft = schedule.endDate
    ? differenceInDays(new Date(schedule.endDate), new Date())
    : null;
  const pendingRequests = lineRequests.filter((request) => ["pending_review", "pending_slip_review", "cash_pending"].includes(request.status));
  const pendingSlipRequests = pendingRequests.filter((request) => request.status === "pending_review" || request.status === "pending_slip_review");
  const pendingCashRequests = pendingRequests.filter((request) => request.status === "cash_pending");

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    getLinePaymentRequests({ scheduleId: schedule.id, status: "pending_review,pending_slip_review,cash_pending" })
      .then((requests) => {
        if (!cancelled) setLineRequests(requests.map(dbLinePaymentRequestToLinePaymentRequest));
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) toast.error("โหลดรายการรอตรวจสอบไม่สำเร็จ");
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, schedule.id]);

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

  const handleSendReminder = async (studentIds?: string[]) => {
    const mode = studentIds?.length === 1 ? studentIds[0] : "all";
    setSendingReminder(mode);
    try {
      const result = await sendScheduleLineReminders(schedule.id, studentIds);
      if (result.sent > 0) {
        toast.success(`ส่ง LINE แล้ว ${result.sent} คน${result.skippedMissingLineId ? ` • ไม่มี LINE ID ${result.skippedMissingLineId} คน` : ""}`);
      } else if (result.skippedMissingLineId > 0) {
        toast.error("ยังส่งไม่ได้: นักเรียนที่ค้างชำระยังไม่มี LINE User ID");
      } else if (result.alreadyPaid > 0) {
        toast.success("รายการนี้ชำระครบแล้ว");
      } else {
        toast.error("ส่งแจ้งเตือนไม่สำเร็จ");
      }

      if (result.failed > 0) {
        toast.error(`ส่งไม่สำเร็จ ${result.failed} คน ตรวจสอบ LINE User ID หรือ Channel token`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งแจ้งเตือนไม่สำเร็จ");
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSendAnnouncement = async () => {
    setSendingAnnouncement(true);
    try {
      const result = await sendScheduleLineAnnouncement(schedule.id);
      if (result.sent > 0) {
        toast.success(`แจ้งกำหนดการแล้ว ${result.sent} คน${result.skippedMissingLineId ? ` • ไม่มี LINE ID ${result.skippedMissingLineId} คน` : ""}`);
      } else if (result.skippedMissingLineId > 0) {
        toast.error("ยังส่งไม่ได้: นักเรียนในกำหนดการยังไม่มี LINE User ID");
      } else {
        toast.error("ส่งแจ้งกำหนดการไม่สำเร็จ");
      }
      if (result.failed > 0) {
        toast.error(`ส่งไม่สำเร็จ ${result.failed} คน ตรวจสอบ LINE User ID หรือ Channel token`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งแจ้งกำหนดการไม่สำเร็จ");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setReviewingRequestId(requestId);
    try {
      const result = await approveLinePaymentRequest(requestId);
      if (result.transaction) addTransaction(dbTransactionToTransaction(result.transaction));
      setLineRequests((requests) => requests.filter((request) => request.id !== requestId));
      toast.success("อนุมัติและบันทึกชำระเงินแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อนุมัติไม่สำเร็จ");
    } finally {
      setReviewingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = window.prompt("เหตุผลที่ปฏิเสธสลิป", "สลิปยังไม่ผ่านการตรวจสอบ");
    if (reason === null) return;
    setReviewingRequestId(requestId);
    try {
      await updateLinePaymentRequest(requestId, { status: "rejected", reject_reason: reason });
      setLineRequests((requests) => requests.filter((request) => request.id !== requestId));
      toast.success("ปฏิเสธรายการแล้ว และแจ้งนักเรียนผ่าน LINE แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ปฏิเสธไม่สำเร็จ");
    } finally {
      setReviewingRequestId(null);
    }
  };

  const portalTarget = typeof document === "undefined" ? null : document.body;
  if (!portalTarget) return null;

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
            className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-2xl"
            style={{ backdropFilter: "blur(16px) saturate(1.05)", WebkitBackdropFilter: "blur(16px) saturate(1.05)" }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.42, bounce: 0.14 }}
              className="apple-panel relative flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden sm:max-h-[min(760px,calc(100dvh-2rem))]"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Header */}
              <div
                className="z-10 shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--panel-solid)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold sm:text-xl" title={schedule.name}>{schedule.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400 sm:mt-2 sm:gap-x-3 sm:gap-y-1 sm:text-sm">
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
                  <div className="grid shrink-0 grid-cols-3 gap-1 sm:flex sm:items-center sm:gap-2">
                    <button
                      onClick={handleSendAnnouncement}
                      disabled={sendingAnnouncement || scheduleStudents.length === 0}
                      className="apple-icon-button h-9 w-9 rounded-xl disabled:opacity-45"
                      aria-label="แจ้งกำหนดการใหม่ผ่าน LINE"
                      title="แจ้งกำหนดการใหม่ผ่าน LINE"
                    >
                      <Megaphone className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleSendReminder(unpaidStudentsWithLine.map((student) => student.id))}
                      disabled={unpaidStudentsWithLine.length === 0 || sendingReminder !== null}
                      className="apple-icon-button h-9 w-9 rounded-xl disabled:opacity-45"
                      aria-label="ส่งแจ้งเตือน LINE"
                      title={unpaidStudentsWithLine.length === 0 ? "ยังไม่มีนักเรียนค้างชำระที่มี LINE User ID" : `ส่งแจ้งเตือน ${unpaidStudentsWithLine.length} คน`}
                    >
                      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </button>
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

              <div className="student-card-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {/* Summary Cards */}
              <div className="border-b px-4 py-3 sm:px-6 sm:py-4" style={{ borderColor: "var(--line)" }}>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-2xl border border-blue-300 bg-gradient-to-br from-blue-50 to-sky-100 p-2 shadow-sm dark:border-blue-500/45 dark:from-blue-950/70 dark:to-sky-950/50 sm:p-3">
                    <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-100 sm:text-xs">
                      จำนวนต่อรายการ
                    </div>
                    <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-200 sm:text-2xl">
                      {schedule.amountPerItem.toLocaleString()} ฿
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-100 p-2 shadow-sm dark:border-emerald-500/45 dark:from-emerald-950/70 dark:to-green-950/50 sm:p-3">
                    <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-100 sm:text-xs">
                      เก็บได้
                    </div>
                    <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-200 sm:text-2xl">
                      {totalCollected.toLocaleString()} ฿
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-100/80 sm:text-xs">
                      {paidCount}/{totalStudents} คน
                    </div>
                  </div>

                  <div className="rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-50 to-red-100 p-2 shadow-sm dark:border-rose-500/45 dark:from-rose-950/70 dark:to-red-950/50 sm:p-3">
                    <div className="text-[11px] font-semibold text-rose-900 dark:text-rose-100 sm:text-xs">
                      ยอดค้าง
                    </div>
                    <div className="mt-1 text-lg font-bold text-rose-700 dark:text-rose-200 sm:text-2xl">
                      {totalRemaining.toLocaleString()} ฿
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-rose-800 dark:text-rose-100/80 sm:text-xs">
                      {unpaidCount} คนค้าง
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border p-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center" style={{ borderColor: "var(--line)", background: "var(--panel-soft)" }}>
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <div className="font-semibold">LINE สำหรับกำหนดการนี้</div>
                    <div className="text-xs text-muted">
                      แจ้งกำหนดการให้ทุกคน หรือเตือนเฉพาะคนค้างชำระ
                      {missingLineCount > 0 ? ` • คนค้างที่ไม่มี LINE ID ${missingLineCount} คน` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendAnnouncement}
                    disabled={sendingAnnouncement || scheduleStudents.length === 0}
                    className="apple-ghost-button justify-center px-3 py-2 text-sm disabled:opacity-45"
                  >
                    <Megaphone className="h-4 w-4" />
                    {sendingAnnouncement ? "กำลังแจ้ง..." : "แจ้งกำหนดการ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendReminder(unpaidStudentsWithLine.map((student) => student.id))}
                    disabled={unpaidStudentsWithLine.length === 0 || sendingReminder !== null}
                    className="apple-button justify-center px-3 py-2 text-sm disabled:opacity-45"
                  >
                    <Bell className="h-4 w-4" />
                    {sendingReminder === "all" ? "กำลังเตือน..." : "เตือนชำระเงิน"}
                  </button>
                </div>
              </div>

              {pendingRequests.length > 0 && (
                <div className="border-b px-4 py-4 sm:px-6" style={{ borderColor: "var(--line)" }}>
                  <div className="rounded-3xl border border-blue-200/80 bg-blue-50/80 p-3 shadow-sm dark:border-blue-500/35 dark:bg-blue-950/20 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                          <ReceiptText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">กล่องตรวจรายการจาก LINE</h3>
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                              {pendingRequests.length} รอตรวจ
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            เปิดสลิป ตรวจยอด แล้วอนุมัติหรือปฏิเสธได้จากตรงนี้
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:min-w-56">
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">รอตรวจสลิป</div>
                          <div className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-300">{pendingSlipRequests.length}</div>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">รอเงินสด</div>
                          <div className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-300">{pendingCashRequests.length}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {pendingRequests.map((request) => {
                      const student = data.students.find((item) => item.id === request.studentId);
                      const methodLabel = request.method === "cash" ? "เงินสด" : request.method === "truemoney" ? "TrueMoney" : "K PLUS";
                      const isCash = request.status === "cash_pending";
                      return (
                        <div key={request.id} className="rounded-3xl border p-3 shadow-sm sm:p-4" style={{ borderColor: "var(--line)", background: "var(--panel-solid)" }}>
                          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="flex min-w-0 gap-3">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isCash ? "bg-amber-100 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"}`}>
                                {isCash ? <Wallet className="h-5 w-5" /> : <ReceiptText className="h-5 w-5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-semibold" title={student ? `${student.prefix} ${student.firstName} ${student.lastName}` : "ไม่พบนักเรียน"}>
                                  {student ? `${student.prefix} ${student.firstName} ${student.lastName}` : "ไม่พบนักเรียน"}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                                  {student && <span>เลขที่ {student.number}</span>}
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{methodLabel}</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-300">{request.amount.toLocaleString()} ฿</span>
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isCash ? "bg-amber-100 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"}`}>
                                    {isCash ? "รอรับเงินสด" : "รอตรวจสลิป"}
                                  </span>
                                </div>
                                {request.slipUrl && (
                                  <a href={request.slipUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/35 dark:bg-blue-950/30 dark:text-blue-300">
                                    <ExternalLink className="h-4 w-4" />
                                    เปิดดูสลิป
                                  </a>
                                )}
                                {request.slipAutoCheckResult && (
                                  <div className="mt-2 rounded-2xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    ผลตรวจอัตโนมัติ: {request.slipAutoCheckResult}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 lg:min-w-64">
                              <button
                                type="button"
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={reviewingRequestId !== null}
                                className="rounded-2xl border border-rose-200 bg-white px-3 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-45 dark:border-rose-500/35 dark:bg-white/5 dark:text-rose-300 dark:hover:bg-rose-950/25"
                              >
                                ไม่อนุมัติ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(request.id)}
                                disabled={reviewingRequestId !== null}
                                className="apple-button justify-center px-3 py-3 text-sm disabled:opacity-45"
                              >
                                <BadgeCheck className="h-4 w-4" />
                                อนุมัติ
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Student List */}
              <div className="px-4 py-3 sm:px-6 sm:py-4">
                <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold">
                    รายชื่อนักเรียน ({filteredStudents.length}/{scheduleStudents.length} คน)
                  </h3>
                  <div className="grid grid-cols-3 gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
                    {[
                      { key: "all", label: "ทั้งหมด", count: totalStudents, tone: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200" },
                      { key: "paid", label: "ชำระแล้ว", count: paidCount, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200" },
                      { key: "unpaid", label: "ค้างชำระ", count: unpaidCount, tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                        className={`flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${statusFilter === tab.key
                            ? "bg-blue-600 text-white"
                            : "text-zinc-700 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                      >
                        <span className="truncate">{tab.label}</span>
                        <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${statusFilter === tab.key ? "bg-white/22 text-white" : tab.tone}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 pb-[calc(5rem+env(safe-area-inset-bottom))] pr-1 sm:pb-4">
                  {filteredStudents.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500">
                      {statusFilter === "all" ? "ไม่มีนักเรียนในกำหนดการนี้" : statusFilter === "paid" ? "ยังไม่มีนักเรียนที่ชำระแล้ว" : "ไม่มีนักเรียนค้างชำระ"}
                    </div>
                  ) : (
                    filteredStudents.map((student, idx) => {

                      const totalPaid = perStudentTotals[student.id] || 0;
                      const hasPaid = totalPaid >= schedule.amountPerItem;
                      const remain = Math.max(0, schedule.amountPerItem - totalPaid);
                      const latestPaidTransaction = latestTransactionByStudent.get(student.id);
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
                          className={`flex flex-col gap-3 rounded-2xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${!hasPaid ? "cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/45" : ""
                            }`}
                          style={{ borderColor: "var(--line)", background: "var(--panel-soft)" }}
                        >
                          <div className="flex min-w-0 items-center gap-3">
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
                            <div className="min-w-0">
                              <div className="truncate font-medium" title={`${student.prefix} ${student.firstName} ${student.lastName}`}>
                                {student.prefix} {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                เลขที่ {student.number} • {student.nickName}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-2 text-right sm:justify-end">
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
                            {latestPaidTransaction && (
                              <TransactionSlipButton transaction={latestPaidTransaction} />
                            )}
                            {!hasPaid && (
                              student.lineUserId ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleSendReminder([student.id]);
                                  }}
                                  disabled={sendingReminder !== null}
                                  className="apple-icon-button h-8 w-8 rounded-xl disabled:opacity-45"
                                  aria-label={`ส่ง LINE ถึง ${student.firstName}`}
                                  title="ส่งแจ้งเตือน LINE"
                                >
                                  <Bell className="h-4 w-4 text-blue-600" />
                                </button>
                              ) : (
                                <span title="ยังไม่มี LINE User ID">
                                  <MessageCircleWarning className="h-5 w-5 text-amber-500" />
                                </span>
                              )
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
    </AnimatePresence>,
    portalTarget
  );
}
