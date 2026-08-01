import { notFound } from "next/navigation";
import { getStudentLineHistory } from "@/lib/server/studentLineStatus";
import { verifyLineStatusToken } from "@/lib/server/lineStatusLink";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ token?: string }> };

function formatBaht(amount: number) {
  return `${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMethod(method: string | undefined) {
  if (method === "kplus") return "K PLUS";
  if (method === "truemoney") return "TrueMoney";
  if (method === "cash") return "เงินสด";
  return "ไม่ระบุช่องทาง";
}

export default async function LineHistoryPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const payload = verifyLineStatusToken(token);
  if (!payload) notFound();

  const history = await getStudentLineHistory(payload.userId);
  if (!history) notFound();
  const totalPaid = history.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <main className="min-h-dvh overflow-y-auto bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <header className="rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-6 text-white shadow-xl shadow-violet-200">
          <p className="text-sm font-medium text-violet-100">ประวัติการชำระเงิน</p>
          <h1 className="mt-1 text-2xl font-bold">{history.student.prefix} {history.student.first_name} {history.student.last_name}</h1>
          <p className="mt-1 text-sm text-violet-100">เลขที่ {history.student.number}{history.student.nick_name ? ` · ${history.student.nick_name}` : ""}</p>
          <div className="mt-5 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-medium text-violet-100">ยอดชำระสะสม</p>
            <p className="mt-1 text-3xl font-bold">{formatBaht(totalPaid)}</p>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><h2 className="font-bold">รายการที่บันทึกแล้ว</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{history.transactions.length} รายการ</span></div>
          {history.transactions.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">ยังไม่มีประวัติการชำระเงิน</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {history.transactions.map((transaction) => (
                <article key={transaction.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><h3 className="font-semibold text-slate-900">{transaction.schedule_id ? history.scheduleById.get(transaction.schedule_id)?.name || transaction.name : transaction.name}</h3><p className="mt-1 text-sm text-slate-500">{formatMethod(transaction.method)} · {formatDateTime(transaction.created_at)}</p></div>
                    <p className="shrink-0 font-bold text-emerald-600">{formatBaht(transaction.amount)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
