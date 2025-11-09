"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { updateTransaction as updateTransactionRemote, deleteTransaction as deleteTransactionRemote } from "@/lib/supabase/transactions";
import { dbTransactionToTransaction } from "@/lib/supabase/adapter";
import { Transaction, TxnKind, PaymentMethod } from "@/types";
import { CategoryDropdown } from "./CategoryDropdown";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อรายการ"),
  kind: z.enum(["income", "expense"]),
  amount: z.number().min(0.01, "กรุณาระบุจำนวนเงินให้มากกว่า 0 และรองรับทศนิยม"),
  method: z.enum(["kplus", "cash", "truemoney"]),
  category: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
}

export function EditTransactionModal({ isOpen, onClose, transaction }: Props) {
  const updateTransaction = useAppStore((state) => state.updateTransaction);
  const deleteTransaction = useAppStore((state) => state.deleteTransaction);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Allow editing for both normal and schedule transactions.

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: transaction.name,
      kind: transaction.kind,
      amount: transaction.amount,
      method: transaction.method || "cash",
      category: transaction.category || "",
    },
  });

  // Reset form when transaction changes
  useEffect(() => {
    reset({
      name: transaction.name,
      kind: transaction.kind,
      amount: transaction.amount,
      method: transaction.method || "cash",
      category: transaction.category || "",
    });
  }, [transaction, reset]);

  const onSubmit = async (formData: FormData) => {
    try {
      const roundedAmount = Math.round(formData.amount * 100) / 100;
      const updated = await updateTransactionRemote(transaction.id, {
        name: formData.name,
        kind: formData.kind,
        amount: roundedAmount,
        method: formData.method,
        category: formData.category,
      });
      updateTransaction(transaction.id, dbTransactionToTransaction(updated));
      toast.success("แก้ไขรายการเรียบร้อย");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("แก้ไขรายการไม่สำเร็จ");
    }
  };

  const handleDelete = async () => {
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
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขรายการ">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">ชื่อรายการ</label>
          <input
            type="text"
            {...register("name")}
            className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="เช่น ค่าอุปกรณ์"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">ประเภท</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" {...register("kind")} value="income" disabled={transaction.source === "schedule"} />
              <span>รายรับ</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" {...register("kind")} value="expense" disabled={transaction.source === "schedule"} />
              <span>รายจ่าย</span>
            </label>
          </div>
          {errors.kind && <p className="mt-1 text-sm text-red-600">{errors.kind.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">จำนวนเงิน (บาท)</label>
          <input
            type="number"
            step="0.01"
            min={0.01}
            inputMode="decimal"
            {...register("amount", { valueAsNumber: true })}
            className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="0"
          />
          {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">ประเภทการชำระ</label>
          <select {...register("method")} className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
            <option value="cash">เงินสด</option>
            <option value="kplus">K PLUS</option>
            <option value="truemoney">TrueMoney</option>
          </select>
          {errors.method && <p className="mt-1 text-sm text-red-600">{errors.method.message}</p>}
        </div>

        {transaction.source !== "schedule" && (
          <div>
            <label className="mb-1 block text-sm font-medium">หมวดหมู่ (ถ้ามี)</label>
            <CategoryDropdown register={register} defaultValue={transaction.category} />
          </div>
        )}

        {!showDeleteConfirm ? (
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button type="submit" className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              บันทึกการแก้ไข
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
            <p className="text-sm text-red-900 dark:text-red-200">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการ "<strong>{transaction.name}</strong>" นี้?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
