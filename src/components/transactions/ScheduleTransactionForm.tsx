"use client";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { PaymentMethod } from "@/types";
import { createTransactions } from "@/lib/supabase/transactions";
import { dbTransactionToTransaction } from "@/lib/supabase/adapter";
import toast from "react-hot-toast";

const schema = z.object({
  scheduleId: z.string().min(1, "กรุณาเลือกกำหนดการ"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

export function ScheduleTransactionForm({ onSuccess, onBack }: Props) {
  const data = useAppStore((state) => state.data);
  const addTransaction = useAppStore((state) => state.addTransaction);
  const [rows, setRows] = useState<Array<{ method: PaymentMethod; amount: number }>>([
    { method: "cash", amount: 0 },
  ]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedScheduleId = watch("scheduleId");
  const selectedSchedule = data.schedules.find((s) => s.id === selectedScheduleId);
  const totalAmount = rows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    setSubmitted(true);
    if (!selectedSchedule) return;

    // Validate student selection
    if (selectedStudents.length === 0) {
      toast.error("กรุณาเลือกนักเรียนอย่างน้อย 1 คน");
      return;
    }

    // Validate total is positive and not exceeding schedule amount
    const expectedTotal = selectedSchedule.amountPerItem;
    if (totalAmount <= 0) {
      toast.error("กรุณากรอกจำนวนเงิน");
      return;
    }
    if (totalAmount > expectedTotal) {
      toast.error("ยอดที่กรอกมากกว่ายอดที่ต้องเก็บ");
      return;
    }

    try {
      // Create transactions for each student × each payment row
      const inputs: any[] = [];
      for (const studentId of selectedStudents) {
        for (const row of rows) {
          if (!row.amount || row.amount <= 0) continue;
          const roundedAmount = Math.round(row.amount * 100) / 100;
          inputs.push({
            name: selectedSchedule.name,
            kind: "income" as const,
            amount: roundedAmount,
            method: row.method,
            category: undefined,
            description: undefined,
            source: "schedule" as const,
            schedule_id: formData.scheduleId,
            student_id: studentId,
          });
        }
      }
      const created = await createTransactions(inputs);
      created.forEach((db) => addTransaction(dbTransactionToTransaction(db)));
      const remain = Math.max(0, Math.round((expectedTotal - totalAmount) * 100) / 100);
      if (remain > 0) {
        toast.success(`บันทึกแล้ว ค้างอีกคนละ ${remain.toLocaleString()} ฿`);
      } else {
        toast.success(`บันทึก ${created.length} รายการเรียบร้อย`);
      }
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
        <label className="mb-1 block text-sm font-medium">กำหนดการ</label>
        <select {...register("scheduleId")} className="w-full rounded-md border px-3 py-2">
          <option value="">เลือกกำหนดการ</option>
          {data.schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.scheduleId && <p className="mt-1 text-sm text-red-600">{errors.scheduleId.message}</p>}
      </div>

      {selectedSchedule && (
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
          <div className="text-sm">
            <strong>จำนวนที่ต้องเก็บ:</strong> {selectedSchedule.amountPerItem} ฿
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">เลือกนักเรียน</label>
        <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3">
          {data.students.map((student) => (
            <label key={student.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={student.id}
                checked={selectedStudents.includes(student.id)}
                onChange={() => toggleStudent(student.id)}
                className="rounded"
              />
              <span className="text-sm">
                {student.number}. {student.firstName} ({student.nickName})
              </span>
            </label>
          ))}
        </div>
        {submitted && selectedStudents.length === 0 && (
          <p className="mt-1 text-sm text-red-600">กรุณาเลือกนักเรียนอย่างน้อย 1 คน</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            การชำระเงิน (รวมต้องเท่ากับ {selectedSchedule?.amountPerItem.toLocaleString() || 0} ฿)
          </label>
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
        <div className="text-right text-sm text-zinc-600 dark:text-zinc-400 space-y-0.5">
          <div>
            รวมที่กรอก: <span className={selectedSchedule && totalAmount > 0 && totalAmount <= selectedSchedule.amountPerItem ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>{totalAmount.toLocaleString()}</span> ฿
          </div>
          {selectedSchedule && totalAmount > 0 && totalAmount < selectedSchedule.amountPerItem && (
            <div className="text-xs text-amber-600 dark:text-amber-400">ค้างอีก {Math.round((selectedSchedule.amountPerItem - totalAmount) * 100) / 100} ฿</div>
          )}
          {selectedSchedule && totalAmount > selectedSchedule.amountPerItem && (
            <div className="text-xs text-red-600">เกิน {Math.round((totalAmount - selectedSchedule.amountPerItem) * 100) / 100} ฿</div>
          )}
        </div>
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
