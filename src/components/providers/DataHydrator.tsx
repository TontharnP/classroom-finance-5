"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getRequiredBootstrapResources } from "@/lib/bootstrap";
import { useAppStore } from "@/lib/store";
import { getBootstrapData } from "@/lib/supabase";
import { dbStudentToStudent, dbScheduleToSchedule, dbScheduleFolderToScheduleFolder, dbTransactionToTransaction, dbCategoryToCategory, dbAdditionalCostRunToAdditionalCostRun, dbAdditionalCostItemToAdditionalCostItem } from "@/lib/supabase/adapter";

export function DataHydrator() {
  const pathname = usePathname();
  const loadedResources = useAppStore((s) => s.loadedResources);
  const mergeData = useAppStore((s) => s.mergeData);
  const markResourcesLoaded = useAppStore((s) => s.markResourcesLoaded);
  const setHydrationError = useAppStore((s) => s.setHydrationError);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const requiredResources = getRequiredBootstrapResources(pathname);
      const missingResources = requiredResources.filter((resource) => !loadedResources.includes(resource));
      if (missingResources.length === 0) return;
      try {
        const bootstrap = await getBootstrapData(missingResources);
        if (cancelled) return;
        mergeData({
          ...(bootstrap.students ? { students: bootstrap.students.map(dbStudentToStudent) } : {}),
          ...(bootstrap.schedules ? { schedules: bootstrap.schedules.map(dbScheduleToSchedule) } : {}),
          ...(bootstrap.scheduleFolders ? { scheduleFolders: bootstrap.scheduleFolders.map(dbScheduleFolderToScheduleFolder) } : {}),
          ...(bootstrap.transactions ? { transactions: bootstrap.transactions.map(dbTransactionToTransaction) } : {}),
          ...(bootstrap.categories ? { categories: bootstrap.categories.map(dbCategoryToCategory) } : {}),
          pockets: [
            { id: "pocket-kplus", name: "K PLUS", color: "emerald", isDefault: false },
            { id: "pocket-cash", name: "Cash", color: "blue", isDefault: false },
            { id: "pocket-truemoney", name: "TrueMoney", color: "amber", isDefault: false },
          ],
          ...(bootstrap.additionalCostRuns ? { additionalCostRuns: bootstrap.additionalCostRuns.map(dbAdditionalCostRunToAdditionalCostRun) } : {}),
          ...(bootstrap.additionalCostItems ? { additionalCostItems: bootstrap.additionalCostItems.map(dbAdditionalCostItemToAdditionalCostItem) } : {}),
        });
      } catch (e) {
        console.error("Hydration from Supabase failed", e);
        setHydrationError((e as Error).message || "ไม่สามารถเชื่อมต่อ Supabase");
      } finally {
        if (!cancelled) markResourcesLoaded(missingResources);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [loadedResources, markResourcesLoaded, mergeData, pathname, setHydrationError]);
  return null;
}
