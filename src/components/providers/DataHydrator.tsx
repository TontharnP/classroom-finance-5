"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { getStudents, getSchedules, getScheduleFolders, getTransactions, getAdditionalCosts } from "@/lib/supabase";
import { getCategories } from "@/lib/supabase/categories";
import { dbStudentToStudent, dbScheduleToSchedule, dbScheduleFolderToScheduleFolder, dbTransactionToTransaction, dbCategoryToCategory, dbAdditionalCostRunToAdditionalCostRun, dbAdditionalCostItemToAdditionalCostItem } from "@/lib/supabase/adapter";

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
        const [dbStudents, dbSchedules, dbScheduleFolders, dbTransactions, dbCategories, additionalCosts] = await Promise.all([
          getStudents(),
          getSchedules(),
          getScheduleFolders(),
          getTransactions(),
          getCategories(),
          getAdditionalCosts(),
        ]);
        if (cancelled) return;
        setData({
          students: dbStudents.map(dbStudentToStudent),
          schedules: dbSchedules.map(dbScheduleToSchedule),
          scheduleFolders: dbScheduleFolders.map(dbScheduleFolderToScheduleFolder),
          transactions: dbTransactions.map(dbTransactionToTransaction),
          categories: dbCategories.map(dbCategoryToCategory),
          // Fallback pockets since we don't have a pockets table yet
          pockets: [
            { id: "pocket-kplus", name: "K PLUS", color: "emerald", isDefault: false },
            { id: "pocket-cash", name: "Cash", color: "blue", isDefault: false },
            { id: "pocket-truemoney", name: "TrueMoney", color: "amber", isDefault: false },
          ],
          additionalCostRuns: additionalCosts.runs.map(dbAdditionalCostRunToAdditionalCostRun),
          additionalCostItems: additionalCosts.items.map(dbAdditionalCostItemToAdditionalCostItem),
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
  }, [isHydrated, setData, markHydrated, setHydrationError]);
  return null;
}
