"use client";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import type { Transaction } from "@/types";
import { useMemo, useState } from "react";
import { EditTransactionModal } from "./EditTransactionModal";
import { deleteTransaction as deleteTransactionRemote } from "@/lib/supabase/transactions";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
}

export function TransactionDetailModal({ isOpen, onClose, transaction }: Props) {
  const data = useAppStore((s) => s.data);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const schedule = useMemo(() => {
    if (transaction.source !== "schedule" || !transaction.scheduleId) return null;
    return data.schedules.find((s) => s.id === transaction.scheduleId) || null;
  }, [transaction.source, transaction.scheduleId, data.schedules]);

  const student = useMemo(() => {
    if (transaction.source !== "schedule" || !transaction.studentId) return null;
    return data.students.find((st) => st.id === transaction.studentId) || null;
  }, [transaction.source, transaction.studentId, data.students]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="รายละเอียดรายการ" size="md">
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border p-4 dark:border-zinc-700">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">ข้อมูลพื้นฐาน</div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">ชื่อรายการ</span>
            <span className="font-medium">{transaction.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">ประเภท</span>
            <span className={transaction.kind === "income" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>
              {transaction.kind === "income" ? "รายรับ" : "รายจ่าย"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">จำนวนเงิน</span>
            <span className="font-semibold">{transaction.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ฿</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">ช่องทาง</span>
            <span className="font-medium capitalize">{transaction.method || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">วันที่</span>
            <span className="font-medium">{format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          {transaction.source === 'transaction' && (
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">หมวดหมู่</span>
              <span className="font-medium">{transaction.category || '-'}</span>
            </div>
          )}
        </div>

        {transaction.source === 'schedule' && schedule && (
          <div className="rounded-lg border p-4 dark:border-zinc-700 space-y-2">
            <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">จากกำหนดการ</div>
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">กำหนดการ</span>
              <span className="font-medium">{schedule.name}</span>
            </div>
            {student && (
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">นักเรียน</span>
                <span className="font-medium">{student.prefix}{student.firstName} {student.lastName} ({student.nickName})</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">จำนวนที่ต้องชำระ</span>
              <span className="font-medium">{schedule.amountPerItem.toLocaleString()} ฿</span>
            </div>
            {student && (
              <StudentRemainingIndicator scheduleId={schedule.id} studentId={student.id} target={schedule.amountPerItem} />
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              setIsDeleting(true);
              try {
                await deleteTransactionRemote(transaction.id);
                deleteTransaction(transaction.id);
                toast.success("ลบรายการเรียบร้อย");
                onClose();
              } catch (e) {
                console.error(e);
                toast.error("ลบรายการไม่สำเร็จ");
              } finally {
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
            className="rounded-md border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/20"
          >
            ลบ
          </button>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            แก้ไข
          </button>
          <button onClick={onClose} className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">ปิด</button>
        </div>

        {isEditOpen && (
          <EditTransactionModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            transaction={transaction}
          />
        )}
      </div>
    </Modal>
  );
}

function StudentRemainingIndicator({ scheduleId, studentId, target }: { scheduleId: string; studentId: string; target: number }) {
  const data = useAppStore((s) => s.data);
  const paid = useMemo(() => {
    return data.transactions
      .filter(t => t.source === 'schedule' && t.scheduleId === scheduleId && t.studentId === studentId)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [data.transactions, scheduleId, studentId]);
  const remain = Math.max(0, Math.round((target - paid) * 100) / 100);
  return (
    <div className="flex justify-between">
      <span className="text-zinc-600 dark:text-zinc-400">สถานะ</span>
      {remain === 0 ? (
        <span className="font-medium text-emerald-600 dark:text-emerald-400">ชำระครบแล้ว</span>
      ) : paid > 0 ? (
        <span className="font-medium text-amber-600 dark:text-amber-400">ชำระแล้ว {paid.toLocaleString()} ฿ • ค้าง {remain.toLocaleString()} ฿</span>
      ) : (
        <span className="font-medium text-rose-600 dark:text-rose-400">ยังไม่ชำระ (ค้าง {target.toLocaleString()} ฿)</span>
      )}
    </div>
  );
}
