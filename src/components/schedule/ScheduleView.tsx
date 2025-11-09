"use client";
import { useState, useEffect, memo, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { Schedule } from "@/types";
import { countStudentPaymentStatus } from "@/lib/calculations";
import { differenceInDays } from "date-fns";
import { AddScheduleModal } from "./AddScheduleModal";
import { ScheduleDetailModal } from "./ScheduleDetailModal";
import { ScheduleCalendar } from "./ScheduleCalendar";

const ScheduleCard = memo(({ schedule, data, onClick }: { schedule: Schedule; data: any; onClick: () => void }) => {
  const status = countStudentPaymentStatus(data, schedule.id);
  const totalAmount = schedule.amountPerItem * schedule.studentIds.length;
  // Sum all payments on this schedule
  const collectedAmount = data.transactions
    .filter((t: any) => t.source === "schedule" && t.scheduleId === schedule.id)
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  
  function getTimeLeft(schedule: Schedule): { label: string; tone: "active" | "ended" | "upcoming" } {
    if (!schedule.endDate) return { label: "", tone: "active" };
    const now = new Date();
    const end = new Date(schedule.endDate + "T23:59:59");
    if (now > end) return { label: "สิ้นสุดแล้ว", tone: "ended" };
    const ms = end.getTime() - now.getTime();
    const days = Math.floor(ms / (24 * 3600 * 1000));
    const hours = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000));
    if (days > 0) return { label: `เหลือ ${days} วัน ${hours} ชม.`, tone: "active" };
    const minutes = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
    return { label: `เหลือ ${hours} ชม. ${minutes} นาที`, tone: "active" };
  }

  const timeLeft = getTimeLeft(schedule);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="cursor-pointer rounded-xl border bg-gradient-to-br from-blue-50/50 to-transparent p-4 hover:shadow-md dark:from-blue-950/20"
    >
      <h3 className="mb-2 font-semibold truncate" title={schedule.name}>{schedule.name}</h3>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <div>จำนวน/รายการ: {schedule.amountPerItem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
        <div>
          เก็บได้: <span className="font-medium text-emerald-600 dark:text-emerald-400">{collectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> / {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
        </div>
        <div className="text-xs">
          ชำระครบ {status.paid} / {schedule.studentIds.length} คน
        </div>
        {timeLeft.label && (
          <div className={`mt-1 text-xs font-medium ${timeLeft.tone === "ended" ? "text-rose-600 dark:text-rose-400" : timeLeft.tone === "upcoming" ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
            {timeLeft.label}
          </div>
        )}
      </div>
    </motion.div>
  );
});
ScheduleCard.displayName = "ScheduleCard";

export function ScheduleView() {
  const data = useAppStore((state) => state.data);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const maxVisible = 5;

  const visibleSchedules = data.schedules.slice(scrollIndex, scrollIndex + maxVisible);
  // tick state for live countdown re-render
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60 * 1000); // update every minute
    return () => clearInterval(id);
  }, []);

  const handleSelectSchedule = useCallback((schedule: Schedule) => {
    setSelectedSchedule(schedule);
  }, []);

  return (
    <div className="space-y-6">
      {/* Add Schedule Button */}
      <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        <Plus className="h-4 w-4" />
        เพิ่มกำหนดการ
      </button>

      <AddScheduleModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      {selectedSchedule && (
        <ScheduleDetailModal
          isOpen={!!selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          schedule={selectedSchedule}
        />
      )}

      {/* Schedule Cards Carousel */}
      <div className="relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
            disabled={scrollIndex === 0}
            className="rounded-full border p-2 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            aria-label="ย้อนกลับ"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {visibleSchedules.length === 0 && (
              <div className="col-span-full rounded-xl border p-6 text-center text-zinc-500 dark:border-zinc-800">
                ยังไม่มีกำหนดการ — กดปุ่ม "เพิ่มกำหนดการ" เพื่อเริ่มสร้าง
              </div>
            )}
            {visibleSchedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                data={data}
                onClick={() => handleSelectSchedule(schedule)}
              />
            ))}
          </div>

          <button
            onClick={() => setScrollIndex(Math.min(data.schedules.length - maxVisible, scrollIndex + 1))}
            disabled={scrollIndex >= data.schedules.length - maxVisible}
            className="rounded-full border p-2 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            aria-label="ถัดไป"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Interactive Calendar */}
      <div className="rounded-xl border bg-white/50 p-6 dark:bg-black/20">
        <h2 className="mb-4 text-lg font-medium">ปฏิทินกำหนดการ</h2>
        <ScheduleCalendar onScheduleClick={(schedule) => setSelectedSchedule(schedule)} />
      </div>
    </div>
  );
}
