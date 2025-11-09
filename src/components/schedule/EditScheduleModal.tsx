"use client";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { Schedule } from "@/types";
import { updateSchedule as updateScheduleRemote } from "@/lib/supabase/schedules";
import { dbScheduleToSchedule } from "@/lib/supabase/adapter";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อกำหนดการ"),
  startDate: z.string().min(1, "กรุณาเลือกวันที่เริ่ม"),
  endDate: z.string().optional(),
  amountPerItem: z.number().min(0.01, "กรุณาระบุจำนวนเงินให้มากกว่า 0 และรองรับทศนิยม"),
  details: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule;
}

export function EditScheduleModal({ isOpen, onClose, schedule }: Props) {
  const data = useAppStore((state) => state.data);
  const updateSchedule = useAppStore((state) => state.updateSchedule);
  const [selectedStudents, setSelectedStudents] = useState<string[]>(schedule.studentIds);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: schedule.name,
      startDate: schedule.startDate,
      endDate: schedule.endDate || "",
      amountPerItem: schedule.amountPerItem,
      details: schedule.details || "",
    },
  });

  // Reset form when schedule changes
  useEffect(() => {
    reset({
      name: schedule.name,
      startDate: schedule.startDate,
      endDate: schedule.endDate || "",
      amountPerItem: schedule.amountPerItem,
      details: schedule.details || "",
    });
    setSelectedStudents(schedule.studentIds);
  }, [schedule, reset]);

  const selectAll = () => {
    setSelectedStudents(data.students.map((s) => s.id));
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    if (selectedStudents.length === 0) {
      toast.error("กรุณาเลือกนักเรียนอย่างน้อย 1 คน");
      return;
    }
    try {
      const roundedAmount = Math.round(formData.amountPerItem * 100) / 100;
      const updated = await updateScheduleRemote(schedule.id, {
        name: formData.name,
        start_date: formData.startDate,
        end_date: formData.endDate || undefined,
        amount_per_item: roundedAmount,
        description: formData.details,
        student_ids: selectedStudents,
      });
      updateSchedule(schedule.id, dbScheduleToSchedule(updated));
      toast.success("แก้ไขกำหนดการเรียบร้อย");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("แก้ไขกำหนดการไม่สำเร็จ");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขกำหนดการ" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">ชื่อกำหนดการ</label>
          <input
            type="text"
            {...register("name")}
            className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="เช่น เงินค่าหนังสือรุ่น"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">วันที่เริ่ม</label>
            <input type="date" {...register("startDate")} className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">วันที่สิ้นสุด (ถ้ามี)</label>
            <input type="date" {...register("endDate")} className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">จำนวนเงินต่อรายการ (บาท)</label>
          <input
            type="number"
            step="0.01"
            min={0.01}
            inputMode="decimal"
            {...register("amountPerItem", { valueAsNumber: true })}
            className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="0"
          />
          {errors.amountPerItem && <p className="mt-1 text-sm text-red-600">{errors.amountPerItem.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">รายละเอียด</label>
          <textarea
            {...register("details")}
            className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            rows={2}
            placeholder="คำอธิบายเพิ่มเติม..."
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium">เลือกนักเรียน</label>
            <button type="button" onClick={selectAll} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              เลือกทั้งหมด
            </button>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3 dark:border-zinc-700 dark:bg-zinc-800">
            {data.students.map((student) => (
              <label key={student.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => handleStudentToggle(student.id)}
                  className="rounded"
                />
                <span className="text-sm">
                  {student.number}. {student.firstName} ({student.nickName})
                </span>
              </label>
            ))}
          </div>
          {selectedStudents.length === 0 && (
            <p className="mt-1 text-sm text-red-600">กรุณาเลือกนักเรียนอย่างน้อย 1 คน</p>
          )}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            ยกเลิก
          </button>
          <button type="submit" className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            บันทึกการแก้ไข
          </button>
        </div>
      </form>
    </Modal>
  );
}
