"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { createSchedule, sendScheduleLineAnnouncement } from "@/lib/supabase/schedules";
import { dbScheduleToSchedule } from "@/lib/supabase/adapter";
import { getFolderPath, getFolderTreeOrder } from "@/lib/schedules/grouping";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อกำหนดการ"),
  startDate: z.string().min(1, "กรุณาเลือกวันที่เริ่ม"),
  endDate: z.string().optional(),
  amountPerItem: z.number().min(0.01, "กรุณาระบุจำนวนเงินให้มากกว่า 0 และรองรับทศนิยม"),
  folderId: z.string().min(1, "กรุณาเลือกโฟลเดอร์"),
  details: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddScheduleModal({ isOpen, onClose }: Props) {
  const data = useAppStore((state) => state.data);
  const addSchedule = useAppStore((state) => state.addSchedule);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const folderOptions = getFolderTreeOrder(data.scheduleFolders);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectAll = () => {
    setSelectedStudents(data.students.map((s) => s.id));
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const onSubmit = async (formData: FormData) => {
    if (selectedStudents.length === 0) {
      toast.error("กรุณาเลือกนักเรียนอย่างน้อย 1 คน");
      return;
    }
    try {
      // Create schedule remotely
      const roundedAmount = Math.round(formData.amountPerItem * 100) / 100;
      const created = await createSchedule({
        name: formData.name,
        amount_per_item: roundedAmount,
        start_date: formData.startDate,
        end_date: formData.endDate || undefined,
        description: formData.details || undefined,
        student_ids: selectedStudents,
        folder_id: formData.folderId,
        sort_order: data.schedules.filter((schedule) => schedule.folderId === formData.folderId).length,
      });
      // Map to UI and update local store for immediate UI
      const ui = dbScheduleToSchedule(created);
      addSchedule(ui);
      if (notifyOnCreate) {
        try {
          const result = await sendScheduleLineAnnouncement(created.id);
          if (result.sent > 0) {
            toast.success(`สร้างกำหนดการและแจ้ง LINE แล้ว ${result.sent} คน${result.skippedMissingLineId ? ` • ไม่มี LINE ID ${result.skippedMissingLineId} คน` : ""}`);
          } else if (result.skippedMissingLineId > 0) {
            toast.success("สร้างกำหนดการแล้ว แต่ยังไม่มีนักเรียนที่มี LINE User ID");
          } else {
            toast.success("สร้างกำหนดการเรียบร้อย");
          }
          if (result.failed > 0) {
            toast.error(`แจ้ง LINE ไม่สำเร็จ ${result.failed} คน`);
          }
        } catch (error) {
          toast.error(error instanceof Error ? `สร้างแล้ว แต่แจ้ง LINE ไม่สำเร็จ: ${error.message}` : "สร้างแล้ว แต่แจ้ง LINE ไม่สำเร็จ");
        }
      } else {
        toast.success("สร้างกำหนดการเรียบร้อย");
      }
      reset();
      setSelectedStudents([]);
      setNotifyOnCreate(true);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("สร้างกำหนดการไม่สำเร็จ");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="เพิ่มกำหนดการใหม่" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">ชื่อกำหนดการ</label>
          <input
            type="text"
            {...register("name")}
            className="w-full rounded-md border px-3 py-2"
            placeholder="เช่น เงินค่าหนังสือรุ่น"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">วันที่เริ่ม</label>
            <input type="date" {...register("startDate")} className="w-full rounded-md border px-3 py-2" />
            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">วันที่สิ้นสุด (ถ้ามี)</label>
            <input type="date" {...register("endDate")} className="w-full rounded-md border px-3 py-2" />
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
            className="w-full rounded-md border px-3 py-2"
            placeholder="0"
          />
          {errors.amountPerItem && <p className="mt-1 text-sm text-red-600">{errors.amountPerItem.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">โฟลเดอร์</label>
          <select {...register("folderId")} className="w-full rounded-md border px-3 py-2">
            <option value="">เลือกโฟลเดอร์</option>
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {getFolderPath(folder.id, data.scheduleFolders)}
              </option>
            ))}
          </select>
          {errors.folderId && <p className="mt-1 text-sm text-red-600">{errors.folderId.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">รายละเอียด</label>
          <textarea
            {...register("details")}
            className="w-full rounded-md border px-3 py-2"
            rows={2}
            placeholder="คำอธิบายเพิ่มเติม..."
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border p-3 text-sm" style={{ borderColor: "var(--line)", background: "var(--panel-soft)" }}>
          <input
            type="checkbox"
            checked={notifyOnCreate}
            onChange={(event) => setNotifyOnCreate(event.target.checked)}
            className="mt-1 rounded"
          />
          <span>
            <span className="block font-medium">แจ้งกำหนดการใหม่ผ่าน LINE หลังสร้าง</span>
            <span className="mt-0.5 block text-xs text-muted">ส่ง Flex card แจ้งว่ามีกำหนดการใหม่ ไม่ใช่การเตือนค้างชำระ</span>
          </span>
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium">เลือกนักเรียน</label>
            <button type="button" onClick={selectAll} className="text-sm text-blue-600 hover:underline">
              เลือกทั้งหมด
            </button>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3">
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
          <button type="button" onClick={onClose} className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            ยกเลิก
          </button>
          <button type="submit" className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            สร้างกำหนดการ
          </button>
        </div>
      </form>
    </Modal>
  );
}
