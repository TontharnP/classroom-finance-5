"use client";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-rose-600" style={{ background: "color-mix(in srgb, var(--danger) 16%, transparent)" }}>
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-bold">เกิดข้อผิดพลาดบางอย่าง</h2>
        <p className="mt-1 text-sm text-muted">ระบบพบปัญหาที่ไม่คาดคิด ลองโหลดใหม่อีกครั้ง</p>
      </div>
      <button type="button" onClick={reset} className="apple-button px-4 py-2 text-sm">
        <RotateCcw className="h-4 w-4" /> ลองใหม่
      </button>
    </div>
  );
}
