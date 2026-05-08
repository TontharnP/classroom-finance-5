"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Banknote, CircleDollarSign, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { calculateBalance, countStudentPaymentStatus } from "@/lib/calculations";
import { useAppStore } from "@/lib/store";
import { getFolderPath, getSchedulesInSystemOrder } from "@/lib/schedules/grouping";
import { cn } from "@/lib/utils";
import { PocketList } from "@/components/pockets/PocketList";
import type { DataBundle, PaymentMethod } from "@/types";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  kplus: "K PLUS",
  cash: "เงินสด",
  truemoney: "TrueMoney",
};

const METHOD_COLORS: Record<PaymentMethod, string> = {
  kplus: "#22c55e",
  cash: "#3b82f6",
  truemoney: "#f59e0b",
};

type DailyCashflow = {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

type MethodTotal = {
  method: PaymentMethod;
  label: string;
  value: number;
  href: string;
};

type ScheduleProgress = {
  id: string;
  name: string;
  target: number;
  collected: number;
  remaining: number;
  percent: number;
  paid: number;
  unpaid: number;
};

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function buildDashboardAnalytics(data: DataBundle, month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  const daysInMonth = Number.isFinite(year) && Number.isFinite(monthIndex)
    ? new Date(year, monthIndex, 0).getDate()
    : 31;

  const daily: DailyCashflow[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return {
      date: `${month}-${String(day).padStart(2, "0")}`,
      label: String(day),
      income: 0,
      expense: 0,
      net: 0,
    };
  });

  const methodTotals: Record<PaymentMethod, number> = {
    kplus: 0,
    cash: 0,
    truemoney: 0,
  };

  let totalIncome = 0;
  let totalExpense = 0;

  for (const transaction of data.transactions) {
    if (!transaction.createdAt.startsWith(month) || transaction.kind === "transfer") continue;

    const dayIndex = Number(transaction.createdAt.slice(8, 10)) - 1;
    const bucket = daily[dayIndex];
    if (!bucket) continue;

    if (transaction.kind === "income") {
      bucket.income += transaction.amount;
      totalIncome += transaction.amount;
      if (transaction.method) methodTotals[transaction.method] += transaction.amount;
    } else if (transaction.kind === "expense") {
      bucket.expense += transaction.amount;
      totalExpense += transaction.amount;
    }
  }

  for (const item of daily) {
    item.net = item.income - item.expense;
  }

  const scheduleProgress: ScheduleProgress[] = getSchedulesInSystemOrder(data)
    .map((schedule) => {
      const target = schedule.amountPerItem * schedule.studentIds.length;
      const perStudentTotals: Record<string, number> = {};
      let collected = 0;

      for (const transaction of data.transactions) {
        if (
          transaction.source !== "schedule" ||
          transaction.kind !== "income" ||
          transaction.scheduleId !== schedule.id
        ) {
          continue;
        }

        collected += transaction.amount;
        if (transaction.studentId) {
          perStudentTotals[transaction.studentId] = (perStudentTotals[transaction.studentId] || 0) + transaction.amount;
        }
      }

      const paid = schedule.studentIds.filter((studentId) => (perStudentTotals[studentId] || 0) >= schedule.amountPerItem).length;
      const remaining = Math.max(0, target - collected);
      const percent = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;

      return {
        id: schedule.id,
        name: schedule.name,
        target,
        collected,
        remaining,
        percent,
        paid,
        unpaid: schedule.studentIds.length - paid,
      };
    })
    .filter((schedule) => schedule.target > 0)
    .sort((a, b) => {
      if (a.remaining === 0 && b.remaining > 0) return 1;
      if (a.remaining > 0 && b.remaining === 0) return -1;
      return b.remaining - a.remaining;
    })
    .slice(0, 5);

  const methodBreakdown: MethodTotal[] = (Object.keys(methodTotals) as PaymentMethod[]).map((method) => ({
    method,
    label: METHOD_LABELS[method],
    value: methodTotals[method],
    href: `/transactions?kind=income&method=${method}`,
  }));

  return {
    daily,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    methodBreakdown,
    scheduleProgress,
    hasMonthTransactions: totalIncome > 0 || totalExpense > 0,
  };
}

export function DashboardOverview() {
  const data = useAppStore((state) => state.data);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const orderedSchedules = useMemo(() => getSchedulesInSystemOrder(data), [data]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(orderedSchedules[0]?.id || "");
  const effectiveScheduleId = selectedScheduleId || orderedSchedules[0]?.id || "";

  const balance = useMemo(() => calculateBalance(data), [data]);
  const analytics = useMemo(() => buildDashboardAnalytics(data, month), [data, month]);
  const paymentStatus = useMemo(() => countStudentPaymentStatus(data, effectiveScheduleId), [data, effectiveScheduleId]);

  const hasSchedules = orderedSchedules.length > 0;
  const hasTransactions = data.transactions.length > 0;

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_400px]">
        <div className="min-w-0 space-y-5 md:space-y-6">
          <div className="apple-card overflow-hidden p-4 sm:p-5 md:p-7 xl:p-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Live classroom finance
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Financial pulse</h2>
                <p className="mt-1 text-sm text-muted">Income, expenses, collection progress, and pockets in one calm workspace.</p>
              </div>
              <div className="flex h-11 min-w-0 items-center gap-3 rounded-2xl border px-3 text-sm text-muted sm:h-12 sm:px-4 lg:w-80" style={{ borderColor: "var(--line)", background: "var(--panel-soft)" }}>
                <Search className="h-4 w-4" />
                <span className="flex-1 truncate">Search Dashboard</span>
                <SlidersHorizontal className="h-4 w-4" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="ยอดรวมคงเหลือ" value={balance.balance.toLocaleString()} subtitle="รวมรายรับ-รายจ่าย" tone="primary" href="/transactions" icon={CircleDollarSign} />
              <StatCard title="รายรับ" value={balance.incomeTxn.toLocaleString()} subtitle="ธุรกรรมทั่วไป" tone="success" href="/transactions?source=transaction&kind=income" icon={ArrowUpRight} />
              <StatCard title="รายจ่าย" value={balance.expenseTxn.toLocaleString()} subtitle="ทั้งหมด" tone="danger" href="/transactions?kind=expense" icon={ArrowDownLeft} />
              <StatCard title="รายรับจากการเก็บ" value={balance.studentIncome.total.toLocaleString()} subtitle="K PLUS / Cash / TrueMoney" href="/transactions?source=schedule" icon={Banknote} />
            </div>
          </div>

          <PocketList />
        </div>

        <div className="visual-gradient relative min-h-[260px] overflow-hidden rounded-[26px] p-5 text-white shadow-2xl sm:min-h-[300px] sm:p-6 2xl:min-h-full">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "linear-gradient(140deg, rgba(255,255,255,0.18), transparent 34%, rgba(117,221,234,0.18) 62%, transparent)",
              filter: "blur(18px)",
            }}
          />
          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-sm font-semibold text-white/70">Current balance</p>
              <div className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{money(balance.balance)} ฿</div>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/14 p-5 shadow-2xl backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-between text-sm text-white/75">
                <span>This month</span>
                <span>{month}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/60">Income</div>
                  <div className="text-xl font-bold">+{money(analytics.totalIncome)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Expense</div>
                  <div className="text-xl font-bold">-{money(analytics.totalExpense)}</div>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-white/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analytics.totalIncome + analytics.totalExpense > 0 ? Math.min(100, Math.round((analytics.totalIncome / (analytics.totalIncome + analytics.totalExpense)) * 100)) : 0}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-2 rounded-full bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student payment counts by schedule */}
      <div className="apple-card p-4 sm:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="text-lg font-medium">สถานะการชำระ</h2>
            <Link href="/schedule" className="text-xs text-blue-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          {hasSchedules ? (
            <select
              value={effectiveScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="w-full rounded-full border px-3 py-2 text-sm sm:w-auto sm:max-w-[360px]"
              aria-label="เลือกกำหนดการ"
            >
              {orderedSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {getFolderPath(s.folderId, data.scheduleFolders)} / {s.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {hasSchedules ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href={`/schedule?scheduleId=${effectiveScheduleId}&status=paid`} className="apple-soft hover-lift rounded-[22px] p-5 hover:shadow-md">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">ชำระแล้ว</div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{paymentStatus.paid}</div>
              <div className="text-xs text-zinc-500">คน</div>
            </Link>
            <Link href={`/schedule?scheduleId=${effectiveScheduleId}&status=unpaid`} className="apple-soft hover-lift rounded-[22px] p-5 hover:shadow-md">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">ค้างชำระ</div>
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{paymentStatus.unpaid}</div>
              <div className="text-xs text-zinc-500">คน</div>
            </Link>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-zinc-500">
            ยังไม่มีกำหนดการ — ไปที่หน้ากำหนดการเพื่อสร้าง
          </div>
        )}
      </div>

      {/* Dashboard Analytics */}
      <div className="apple-card p-4 sm:p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="text-lg font-medium">ภาพรวมการเงินรายเดือน</h2>
            <Link href="/transactions" className="text-xs text-blue-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-full border px-3 py-2 text-sm sm:w-auto"
            aria-label="เลือกเดือน"
          />
        </div>
        {hasTransactions && analytics.hasMonthTransactions ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniSummaryCard
                href="/transactions?kind=income"
                label="รายรับเดือนนี้"
                value={analytics.totalIncome}
                tone="success"
              />
              <MiniSummaryCard
                href="/transactions?kind=expense"
                label="รายจ่ายเดือนนี้"
                value={analytics.totalExpense}
                tone="danger"
              />
              <MiniSummaryCard
                href="/transactions"
                label="สุทธิเดือนนี้"
                value={analytics.net}
                tone={analytics.net >= 0 ? "primary" : "danger"}
                signed
              />
            </div>

            <div className="apple-soft h-64 rounded-[24px] p-2 sm:h-72 sm:p-3 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.daily} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-strong)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickFormatter={(value: number) => money(value)}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        income: "รายรับ",
                        expense: "รายจ่าย",
                        net: "สุทธิ",
                      };
                      return [`${money(value)} ฿`, labels[name] || name];
                    }}
                    labelFormatter={(label) => `วันที่ ${label}`}
                  />
                  <Bar dataKey="income" fill="var(--cyan)" radius={[8, 8, 0, 0]} name="รายรับ" />
                  <Bar dataKey="expense" fill="var(--pink)" radius={[8, 8, 0, 0]} name="รายจ่าย" />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="สุทธิ"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
              <div className="apple-soft rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">ช่องทางรับเงิน</h3>
                  <Link href="/transactions?kind=income" className="text-xs text-blue-600 hover:underline">ดูรายรับ →</Link>
                </div>
                <div className="space-y-3">
                  {analytics.methodBreakdown.map((item) => {
                    const percent = analytics.totalIncome > 0 ? Math.round((item.value / analytics.totalIncome) * 100) : 0;
                    return (
                      <Link key={item.method} href={item.href} className="block rounded-2xl p-3 hover:bg-white/55 dark:hover:bg-white/5">
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: METHOD_COLORS[item.method] }} />
                            <span>{item.label}</span>
                          </div>
                          <span className="font-medium">{money(item.value)} ฿</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${percent}%`, backgroundColor: METHOD_COLORS[item.method] }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="apple-soft rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">ความคืบหน้าการเก็บเงิน</h3>
                  <Link href="/schedule" className="text-xs text-blue-600 hover:underline">ดูตาราง →</Link>
                </div>
                {analytics.scheduleProgress.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.scheduleProgress.map((schedule) => (
                      <Link
                        key={schedule.id}
                        href={`/schedule?scheduleId=${schedule.id}`}
                        className="block rounded-2xl border p-4 transition-colors hover:shadow-md"
                        style={{ borderColor: "var(--line)", background: "var(--panel)" }}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{schedule.name}</div>
                            <div className="text-xs text-zinc-500">
                              ชำระแล้ว {schedule.paid} คน · ค้าง {schedule.unpaid} คน
                            </div>
                          </div>
                          <div className="text-right text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {schedule.percent}%
                          </div>
                        </div>
                        <div className="mb-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${schedule.percent}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span>เก็บแล้ว {money(schedule.collected)} ฿</span>
                          <span>ค้าง {money(schedule.remaining)} ฿</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    ยังไม่มีกำหนดการสำหรับติดตามการเก็บเงิน
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-80 items-center justify-center text-sm text-zinc-500">
            {!hasTransactions
              ? "ยังไม่มีรายการธุรกรรม"
              : "ไม่พบข้อมูลในเดือนที่เลือก"}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniSummaryCard({
  href,
  label,
  value,
  tone,
  signed,
}: {
  href: string;
  label: string;
  value: number;
  tone: "primary" | "success" | "danger";
  signed?: boolean;
}) {
  const toneClass = tone === "success"
    ? "text-emerald-600 dark:text-emerald-400"
    : tone === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : "text-blue-600 dark:text-blue-400";
  const prefix = signed && value > 0 ? "+" : "";

  return (
    <Link href={href} className="block min-w-0 rounded-2xl border bg-zinc-50/50 p-3 transition-colors hover:border-zinc-400 dark:bg-zinc-900/40 dark:hover:border-zinc-600">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={cn("text-lg font-bold text-balance-safe sm:text-xl", toneClass)}>
        {prefix}{money(value)} ฿
      </div>
    </Link>
  );
}

function StatCard({ title, value, subtitle, tone, href, icon: Icon }: { title: string; value: string | number; subtitle?: string; tone?: "primary" | "success" | "danger"; href?: string; icon?: React.ComponentType<{ className?: string }>; }) {
  const toneClass = tone === "primary" ? "text-[var(--primary)]" : tone === "success" ? "text-[var(--success)]" : tone === "danger" ? "text-[var(--danger)]" : "text-[var(--primary)]";

  const content = (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "apple-soft h-full rounded-[24px] p-5 transition-all",
        href && "cursor-pointer hover:shadow-lg"
      )}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium text-muted">{title}</div>
        {Icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-2xl", toneClass)} style={{ background: "var(--primary-soft)" }}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="text-balance-safe text-xl font-bold tracking-tight sm:text-2xl">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-muted">{subtitle}</div>}
    </motion.div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }

  return content;
}
