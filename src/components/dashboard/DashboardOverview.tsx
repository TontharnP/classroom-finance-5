"use client";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { calculateBalance, summarizeByCategory, countStudentPaymentStatus } from "@/lib/calculations";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7"];

export function DashboardOverview() {
  const data = useAppStore((state) => state.data);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(data.schedules[0]?.id || "");

  const balance = useMemo(() => calculateBalance(data), [data]);
  const categoryData = useMemo(() => summarizeByCategory(data, month), [data, month]);
  const paymentStatus = useMemo(() => countStudentPaymentStatus(data, selectedScheduleId), [data, selectedScheduleId]);

  const hasSchedules = data.schedules.length > 0;
  const hasTransactions = data.transactions.length > 0;

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="ยอดรวมคงเหลือ" value={balance.balance.toLocaleString()} subtitle="รวมรายรับ-รายจ่าย" tone="primary" />
        <StatCard title="รายรับ (ธุรกรรม)" value={balance.incomeTxn.toLocaleString()} subtitle="ไม่นับการเก็บนักเรียน" tone="success" />
        <StatCard title="รายจ่าย (ธุรกรรม)" value={balance.expenseTxn.toLocaleString()} subtitle="ทั้งหมด" tone="danger" />
        <StatCard title="รายรับจากการเก็บ" value={balance.studentIncome.total.toLocaleString()} subtitle="ธนาคาร/เงินสด/TrueMoney" />
      </div>

      {/* Payment method breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <MethodCard label="K PLUS" amount={balance.methodBreakdown.kplus} />
        <MethodCard label="เงินสด" amount={balance.methodBreakdown.cash} />
        <MethodCard label="TrueMoney" amount={balance.methodBreakdown.truemoney} />
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

      {/* Pie by category */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">แผนภูมิวงกลมตามหมวดหมู่ (เดือน)</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border px-2 py-1 text-sm"
            aria-label="เลือกเดือน"
          />
        </div>
        {hasTransactions && categoryData.length > 0 ? (
          <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {categoryData.map((entry: { name: string; value: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-80 items-center justify-center text-sm text-zinc-500">
            {!hasTransactions 
              ? "ยังไม่มีรายการธุรกรรม — ไปที่หน้า 'รายการธุรกรรม' เพื่อสร้าง"
              : "ไม่พบข้อมูลในเดือนที่เลือก — ลองเลือกเดือนอื่น"}
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
