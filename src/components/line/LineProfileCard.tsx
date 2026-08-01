"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

type LineProfileCardProps = {
  token: string;
  student: {
    prefix: string;
    firstName: string;
    lastName: string;
    number: number;
    nickName?: string;
  };
};

export function LineProfileCard({ token, student }: LineProfileCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [nickName, setNickName] = useState(student.nickName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setNickName(student.nickName || "");
  }, [student.nickName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/line/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nickName }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      setNickName(result.nickName || "");
      setIsEditing(false);
      setSuccess("บันทึกชื่อเล่นเรียบร้อยแล้ว");
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="shrink-0 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5" aria-labelledby="profile-heading">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700" aria-hidden="true">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="profile-heading" className="font-bold text-slate-900">ข้อมูลส่วนตัว</h2>
            <p className="truncate text-sm text-slate-500">{student.prefix} {student.firstName} {student.lastName} · เลขที่ {student.number}</p>
          </div>
        </div>
        {!isEditing && (
          <button type="button" onClick={() => { setError(null); setSuccess(null); setIsEditing(true); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
            <Pencil className="h-4 w-4" />
            แก้ไข
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            ชื่อเล่น
            <input value={nickName} onChange={(event) => setNickName(event.target.value)} maxLength={50} autoFocus placeholder="ไม่บังคับ" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" />
          </label>
          <button type="button" disabled={isSaving} onClick={() => { setNickName(student.nickName || ""); setError(null); setIsEditing(false); }} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">ยกเลิก</button>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{isSaving ? "กำลังบันทึก..." : "บันทึก"}</button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-slate-600">ชื่อเล่น: <span className="font-semibold text-slate-900">{student.nickName || "ยังไม่ได้ตั้ง"}</span></p>
      )}

      <p className="mt-3 text-xs text-slate-500">แก้ไขได้เฉพาะชื่อเล่น หากต้องการแก้ไขชื่อ–นามสกุลหรือเลขที่ โปรดติดต่อเหรัญญิก</p>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
      {success && <p role="status" className="mt-2 text-sm font-medium text-emerald-600">{success}</p>}
    </section>
  );
}
