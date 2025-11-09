"use client";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Transaction, PaymentMethod } from "@/types";
import { createTransaction } from "@/lib/supabase/transactions";
import { dbTransactionToTransaction } from "@/lib/supabase/adapter";
import { CategoryDropdown } from "./CategoryDropdown";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อรายการ"),
  kind: z.enum(["income", "expense"]),
  category: z.string().min(1, "กรุณาระบุหมวดหมู่"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

export function NormalTransactionForm({ onSuccess, onBack }: Props) {
  const addTransaction = useAppStore((state) => state.addTransaction);
  const [rows, setRows] = useState<Array<{ method: PaymentMethod; amount: number }>>([
    { method: "cash", amount: 0 },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: "income",
    },
  });

  const totalAmount = rows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    // Validate that at least one row has amount > 0
    if (totalAmount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินอย่างน้อย 1 ช่อง");
      return;
    }

    try {
      // Create multiple transactions per row
      for (const r of rows) {
        if (!r.amount || r.amount <= 0) continue;
        const roundedAmount = Math.round(r.amount * 100) / 100;
        const created = await createTransaction({
          name: formData.name,
          kind: formData.kind,
          amount: roundedAmount,
          method: r.method,
          category: formData.category,
          description: formData.description,
          source: "transaction",
          schedule_id: undefined,
          student_id: undefined,
        });
        addTransaction(dbTransactionToTransaction(created));
      }
      toast.success("บันทึกรายการเรียบร้อย");
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error("บันทึกรายการไม่สำเร็จ");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        <ChevronLeft className="h-4 w-4" />
        กลับ
      </button>

      <div>
        <label className="mb-1 block text-sm font-medium">ชื่อรายการ</label>
        <input
          type="text"
          {...register("name")}
          className="w-full rounded-md border px-3 py-2"
          placeholder="เช่น ซื้ออุปกรณ์กีฬา"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">ประเภท</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" value="income" {...register("kind")} />
            <span>รายรับ</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="expense" {...register("kind")} />
            <span>รายจ่าย</span>
          </label>
        </div>
        {errors.kind && <p className="mt-1 text-sm text-red-600">{errors.kind.message}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">การชำระเงิน (สามารถแบ่งหลายช่องทางได้)</label>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { method: "cash", amount: 0 }])}
            className="rounded-md border px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            เพิ่มช่อง
          </button>
        </div>
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2">
            <select
              value={row.method}
              onChange={(e) => {
                const method = e.target.value as PaymentMethod;
                setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, method } : r)));
              }}
              className="col-span-5 rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="kplus">K PLUS</option>
              <option value="cash">เงินสด</option>
              <option value="truemoney">TrueMoney</option>
            </select>
            <input
              type="number"
              min={0}
              step={0.01}
              value={row.amount || ""}
              onChange={(e) => {
                const amount = Number(e.target.value || 0);
                setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, amount } : r)));
              }}
              className="col-span-6 rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="จำนวนเงิน"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                className="col-span-1 rounded-md border px-2 py-2 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                aria-label="ลบแถว"
              >
                ลบ
              </button>
            )}
          </div>
        ))}
        <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">
          รวมทั้งหมด: <span className="font-medium text-emerald-600 dark:text-emerald-400">{totalAmount.toLocaleString()}</span> ฿
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">หมวดหมู่</label>
        <CategoryDropdown register={register} error={errors.category?.message} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">คำอธิบาย (ถ้ามี)</label>
        <textarea
          {...register("description")}
          className="w-full rounded-md border px-3 py-2"
          rows={3}
          placeholder="รายละเอียดเพิ่มเติม..."
        />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          ยกเลิก
        </button>
        <button type="submit" className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          บันทึก
        </button>
      </div>
    </form>
  );
}
