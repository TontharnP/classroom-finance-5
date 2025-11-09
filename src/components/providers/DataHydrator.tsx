"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { getStudents, getSchedules, getTransactions } from "@/lib/supabase";
import { getCategories } from "@/lib/supabase/categories";
import { dbStudentToStudent, dbScheduleToSchedule, dbTransactionToTransaction, dbCategoryToCategory } from "@/lib/supabase/adapter";

export function DataHydrator() {
  const isHydrated = useAppStore((s) => s.isHydrated);
  const setData = useAppStore((s) => s.setData);
  const markHydrated = useAppStore((s) => s.markHydrated);
  const setHydrationError = useAppStore((s) => s.setHydrationError);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (isHydrated) return;
      try {
        const [dbStudents, dbSchedules, dbTransactions, dbCategories] = await Promise.all([
          getStudents(),
          getSchedules(),
          getTransactions(),
          getCategories(),
        ]);
        if (cancelled) return;
        setData({
          students: dbStudents.map(dbStudentToStudent),
          schedules: dbSchedules.map(dbScheduleToSchedule),
          transactions: dbTransactions.map(dbTransactionToTransaction),
          categories: dbCategories.map(dbCategoryToCategory),
        });
      } catch (e) {
        console.error("Hydration from Supabase failed", e);
        setHydrationError((e as Error).message || "ไม่สามารถเชื่อมต่อ Supabase");
      } finally {
        if (!cancelled) markHydrated();
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, setData, markHydrated]);
  return null;
}
