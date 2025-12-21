"use client";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export function HydrationStatus() {
  const isHydrated = useAppStore((s) => s.isHydrated);
  const hydrationError = useAppStore((s) => s.hydrationError);
  const markHydrated = useAppStore((s) => s.markHydrated);
  const setHydrationError = useAppStore((s) => s.setHydrationError);

  return (
    <AnimatePresence>
      {!isHydrated && !hydrationError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-medium text-white shadow-md"
        >
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          กำลังโหลดข้อมูลจากระบบ...
        </motion.div>
      )}
      {hydrationError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-4 bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-sm font-medium text-white shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-4 w-4 animate-pulse rounded-full bg-white/60" />
            เชื่อมต่อ Supabase ล้มเหลว: {hydrationError}
          </div>
          <button
            onClick={() => {
              // Clear error and reload page so DataHydrator runs again from a clean state
              setHydrationError(null);
              window.location.reload();
            }}
            className="rounded bg-white/20 px-3 py-1 hover:bg-white/30"
          >
            ลองใหม่
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
