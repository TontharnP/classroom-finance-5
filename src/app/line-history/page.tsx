import { notFound } from "next/navigation";
import { getStudentLineHistory } from "@/lib/server/studentLineStatus";
import { verifyLineStatusToken } from "@/lib/server/lineStatusLink";
import { LineProfileCard } from "@/components/line/LineProfileCard";

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
  if (!token || !payload) notFound();

  const history = await getStudentLineHistory(payload.userId);
  if (!history) notFound();
  const totalPaid = history.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <main className="h-dvh overflow-hidden bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-3 sm:gap-5">
        <header className="grid shrink-0 gap-4 rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 text-white shadow-xl shadow-violet-200 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.72fr)] md:items-end lg:p-8">
          <div className="min-w-0">
            <p className="text-sm font-medium text-violet-100">ประวัติการชำระเงิน</p>
            <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{history.student.prefix} {history.student.first_name} {history.student.last_name}</h1>
            <p className="mt-1 text-sm text-violet-100 sm:text-base">เลขที่ {history.student.number}{history.student.nick_name ? ` · ${history.student.nick_name}` : ""}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4">
            <p className="text-xs font-medium text-violet-100">ยอดชำระสะสม</p>
            <p className="mt-1 text-3xl font-bold sm:text-4xl">{formatBaht(totalPaid)}</p>
          </div>
        </header>

        <LineProfileCard
          token={token}
          student={{
            prefix: history.student.prefix,
            firstName: history.student.first_name,
            lastName: history.student.last_name,
            number: history.student.number,
            nickName: history.student.nick_name,
          }}
        />

        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
            <h2 className="font-bold sm:text-lg">รายการที่บันทึกแล้ว</h2>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{history.transactions.length} รายการ</span>
          </div>
          {history.transactions.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">ยังไม่มีประวัติการชำระเงิน</p>
          ) : (
            <div className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" aria-label="รายการชำระเงินที่บันทึกแล้ว">
              <div className="divide-y divide-slate-100">
                {history.transactions.map((transaction) => (
                  <article key={transaction.id} className="py-4 first:pt-3 last:pb-3 sm:px-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-5">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900 sm:text-lg">{transaction.schedule_id ? history.scheduleById.get(transaction.schedule_id)?.name || transaction.name : transaction.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{formatMethod(transaction.method)} · {formatDateTime(transaction.created_at)}</p>
                      </div>
                      <p className="shrink-0 whitespace-nowrap font-bold text-emerald-600 sm:text-lg">{formatBaht(transaction.amount)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
