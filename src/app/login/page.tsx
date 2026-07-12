"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error === "Incorrect password" ? "รหัสผ่านไม่ถูกต้อง" : "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      router.replace(next);
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center p-4">
      <div className="apple-panel w-full max-w-sm p-6 sm:p-8">
        <div className="visual-gradient mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-white">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-center text-lg font-bold">ระบบการเงินห้องเรียน</h1>
        <p className="mt-1 text-center text-sm text-muted">กรอกรหัสผ่านเพื่อเข้าใช้งาน</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="รหัสผ่าน"
            autoFocus
            required
            className="w-full rounded-full border px-4 py-2.5 text-sm"
          />
          {error && <p className="text-center text-sm font-medium text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="apple-button justify-center px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
