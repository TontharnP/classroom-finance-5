import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--primary)]" style={{ background: "var(--primary-soft)" }}>
        <Compass className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-bold">ไม่พบหน้านี้</h2>
        <p className="mt-1 text-sm text-muted">หน้าที่คุณค้นหาอาจถูกย้ายหรือไม่มีอยู่</p>
      </div>
      <Link href="/dashboard" className="apple-button px-4 py-2 text-sm">
        กลับหน้าแดชบอร์ด
      </Link>
    </div>
  );
}
