import { notFound } from "next/navigation";
import { getStudentLineStatus } from "@/lib/server/studentLineStatus";
import { verifyLineStatusToken } from "@/lib/server/lineStatusLink";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ token?: string }> };

function formatBaht(amount: number) {
  return `${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
}

function formatDate(value: string | undefined) {
  if (!value) return "ไม่ระบุวันครบกำหนด";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ไม่ระบุวันครบกำหนด";
  return `ครบกำหนด ${date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default async function LineStatusPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const payload = verifyLineStatusToken(token);
  if (!payload) notFound();

  const status = await getStudentLineStatus(payload.userId);
  if (!status) notFound();

  return (
    <main className="min-h-dvh overflow-y-auto bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <header className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white shadow-xl shadow-blue-200">
          <p className="text-sm font-medium text-blue-100">สถานะการชำระเงิน</p>
          <h1 className="mt-1 text-2xl font-bold">{status.student.prefix} {status.student.first_name} {status.student.last_name}</h1>
          <p className="mt-1 text-sm text-blue-100">เลขที่ {status.student.number}{status.student.nick_name ? ` · ${status.student.nick_name}` : ""}</p>
          <div className="mt-5 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-medium text-blue-100">ยอดค้างชำระรวม</p>
            <p className="mt-1 text-3xl font-bold">{formatBaht(status.totalDebt)}</p>
          </div>
        </header>

        {status.pendingReviews.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <p className="font-semibold">มี {status.pendingReviews.length} รายการรอตรวจสอบ</p>
            <p className="mt-1 text-sm text-amber-800">เหรัญญิกจะยืนยันผลให้หลังตรวจสอบสลิปหรือการชำระเงินแล้ว</p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">รายการค้างชำระ</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{status.debts.length} รายการ</span>
          </div>
          {status.debts.length === 0 ? (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">ไม่มีรายการค้างชำระ ✅</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {status.debts.map(({ schedule, remaining }) => (
                <article key={schedule.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><h3 className="font-semibold text-slate-900">{schedule.name}</h3><p className="mt-1 text-sm text-slate-500">{formatDate(schedule.end_date || schedule.start_date)}</p></div>
                    <p className="shrink-0 font-bold text-rose-600">{formatBaht(remaining)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className="px-2 text-center text-xs leading-5 text-slate-500">ชำระแล้วแต่สถานะยังไม่เปลี่ยน? ส่งสลิปใน LINE แล้วรอเหรัญญิกตรวจสอบได้เลย</p>
      </div>
    </main>
  );
}
