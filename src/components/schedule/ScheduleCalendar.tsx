"use client";
import { useState } from "react";
import Calendar from "react-calendar";
// Base styles imported globally now; remove component-level CSS import to avoid order conflicts
// import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import { format, isSameDay, parseISO } from "date-fns";
import { useAppStore } from "@/lib/store";
import type { Schedule } from "@/types";

type ScheduleCalendarProps = {
  onScheduleClick: (schedule: Schedule) => void;
};

export function ScheduleCalendar({ onScheduleClick }: ScheduleCalendarProps) {
  const data = useAppStore((state) => state.data);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showSchedules, setShowSchedules] = useState(false);

  // Get schedules for the selected date
  const schedulesOnDate = selectedDate
    ? data.schedules.filter((schedule) => {
        const startDate = parseISO(schedule.startDate);
        const endDate = schedule.endDate ? parseISO(schedule.endDate) : null;

        if (endDate) {
          return selectedDate >= startDate && selectedDate <= endDate;
        }
        return isSameDay(startDate, selectedDate);
      })
    : [];

  // Check if a date has any schedules
  const hasScheduleOnDate = (date: Date) => {
    return data.schedules.some((schedule) => {
      const startDate = parseISO(schedule.startDate);
      const endDate = schedule.endDate ? parseISO(schedule.endDate) : null;

      if (endDate) {
        return date >= startDate && date <= endDate;
      }
      return isSameDay(startDate, date);
    });
  };

  const handleDateChange = (value: any) => {
    const date = Array.isArray(value) ? value[0] : value;
    setSelectedDate(date);
    setShowSchedules(date !== null && schedulesOnDate.length > 0);
  };

  return (
    <div className="space-y-4">
      {/* Calendar with custom styles */}
      <div className="calendar-wrapper">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          locale="th-TH"
          tileClassName={({ date }) =>
            hasScheduleOnDate(date) ? "react-calendar__tile--hasSchedule" : ""
          }
        />
      </div>

      {/* Schedules for selected date */}
      <AnimatePresence>
        {showSchedules && schedulesOnDate.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              กำหนดการวันที่ {selectedDate && format(selectedDate, "dd/MM/yyyy")} (
              {schedulesOnDate.length} รายการ)
            </h3>
            <div className="space-y-2">
              {schedulesOnDate.map((schedule, idx) => (
                <motion.button
                  key={schedule.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onScheduleClick(schedule)}
                  className="w-full rounded-lg border bg-white p-4 text-left hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{schedule.name}</div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {schedule.amountPerItem.toLocaleString()} ฿ •{" "}
                        {schedule.studentIds.length} คน
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      คลิกเพื่อดู
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
          <span>มีกำหนดการ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-300"></div>
          <span>วันนี้</span>
        </div>
      </div>
    </div>
  );
}
