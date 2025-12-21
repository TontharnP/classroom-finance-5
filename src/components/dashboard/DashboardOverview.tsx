"use client";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { calculateBalance, summarizeByMethodAndExpense, countStudentPaymentStatus } from "@/lib/calculations";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PocketList } from "@/components/pockets/PocketList";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"]; // Emerald (K+), Blue (Cash), Amber (TrueMoney), Red (Expense)

export function DashboardOverview() {
  const data = useAppStore((state) => state.data);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(data.schedules[0]?.id || "");

  const balance = useMemo(() => calculateBalance(data), [data]);
  const graphData = useMemo(() => summarizeByMethodAndExpense(data, month), [data, month]);
  const paymentStatus = useMemo(() => countStudentPaymentStatus(data, selectedScheduleId), [data, selectedScheduleId]);

  const hasSchedules = data.schedules.length > 0;
  const hasTransactions = data.transactions.length > 0;

  return (
    <div className="space-y-6">
      {/* Pockets */}
      <PocketList />

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="ยอดรวมคงเหลือ" value={balance.balance.toLocaleString()} subtitle="รวมรายรับ-รายจ่าย" tone="primary" />
        <StatCard title="รายรับ (ธุรกรรม)" value={balance.incomeTxn.toLocaleString()} subtitle="ไม่นับการเก็บนักเรียน" tone="success" />
        <StatCard title="รายจ่าย (ธุรกรรม)" value={balance.expenseTxn.toLocaleString()} subtitle="ทั้งหมด" tone="danger" />
        <StatCard title="รายรับจากการเก็บ" value={balance.studentIncome.total.toLocaleString()} subtitle="ธนาคาร/เงินสด/TrueMoney" />
      </div>

      {/* Student payment counts by schedule */}
      <div className="rounded-xl border p-4">
        <div className="mb-3 flex items-center gap-4">
          <h2 className="text-lg font-medium">สถานะการชำระ</h2>
          {hasSchedules ? (
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="rounded-md border px-2 py-1 text-sm"
              aria-label="เลือกกำหนดการ"
            >
              {data.schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {hasSchedules ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-emerald-50/50 p-4 dark:bg-emerald-950/20">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">ชำระแล้ว</div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{paymentStatus.paid}</div>
              <div className="text-xs text-zinc-500">คน</div>
            </div>
            <div className="rounded-lg border bg-rose-50/50 p-4 dark:bg-rose-950/20">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">ค้างชำระ</div>
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{paymentStatus.unpaid}</div>
              <div className="text-xs text-zinc-500">คน</div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-zinc-500">
            ยังไม่มีกำหนดการ — ไปที่หน้า "กำหนดการ" เพื่อสร้าง
          </div>
        )}
      </div>

      {/* Pie Chart: Income by Method vs Expense */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">สรุปการเงิน (ตามวิธีชำระ & รายจ่าย)</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
            aria-label="เลือกเดือน"
          />
        </div>
        {hasTransactions && graphData.length > 0 ? (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={graphData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {graphData.map((entry: { name: string; value: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => val.toLocaleString() + " ฿"} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-3 mt-2 flex-wrap">
                {graphData.map((entry: { name: string; value: number }, index: number) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-zinc-600 dark:text-zinc-400">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-4 text-sm">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border dark:border-zinc-700">
                <div className="text-zinc-500">รวมรายรับ</div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {graphData.filter(d => d.name !== "รายจ่าย").reduce((s, d) => s + d.value, 0).toLocaleString()} ฿
                </div>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border dark:border-zinc-700">
                <div className="text-zinc-500">รวมรายจ่าย</div>
                <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {graphData.find(d => d.name === "รายจ่าย")?.value.toLocaleString() || "0"} ฿
                </div>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border dark:border-zinc-700">
                <div className="text-zinc-500">คงเหลือสุทธิ (เดือนนี้)</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {(
                    graphData.filter(d => d.name !== "รายจ่าย").reduce((s, d) => s + d.value, 0) -
                    (graphData.find(d => d.name === "รายจ่าย")?.value || 0)
                  ).toLocaleString()} ฿
                </div>
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

function StatCard({ title, value, subtitle, tone }: { title: string; value: string | number; subtitle?: string; tone?: "primary" | "success" | "danger"; }) {
  const toneClass = tone === "primary" ? "from-blue-500/10" : tone === "success" ? "from-emerald-500/10" : tone === "danger" ? "from-rose-500/10" : "from-zinc-500/10";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className={cn("rounded-xl border p-4 bg-gradient-to-br to-transparent", toneClass)}>
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-zinc-400">{subtitle}</div>}
    </motion.div>
  );
}

function MethodCard({ label, amount }: { label: string; amount: number; }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-xl font-semibold">{amount.toLocaleString()} ฿</div>
    </div>
  );
}
