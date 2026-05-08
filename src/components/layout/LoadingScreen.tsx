import React from "react";

export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
      style={{
        background: "color-mix(in srgb, var(--panel-solid) 82%, transparent)",
        backdropFilter: "blur(28px) saturate(1.2)",
      }}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="loader-square" />
      <span className="text-base font-medium text-zinc-700 dark:text-zinc-200">
        กำลังโหลดข้อมูล...
      </span>
    </div>
  );
}
