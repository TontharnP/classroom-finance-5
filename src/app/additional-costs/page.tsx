"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, CalendarClock, CheckCircle2, ReceiptText, UsersRound } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { buildAdditionalCostPreview } from "@/lib/additionalCosts";
import { applyAdditionalCost } from "@/lib/supabase/additionalCosts";
import {
  dbAdditionalCostItemToAdditionalCostItem,
  dbAdditionalCostRunToAdditionalCostRun,
} from "@/lib/supabase/adapter";
import { useAppStore } from "@/lib/store";

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdditionalCostsPage() {
  const data = useAppStore((state) => state.data);
  const addAdditionalCostRun = useAppStore((state) => state.addAdditionalCostRun);
  const [percentageInput, setPercentageInput] = useState("5");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const percentage = Number(percentageInput);
  const percentageValid = Number.isFinite(percentage) && percentage > 0 && percentage <= 100;
  const preview = useMemo(
    () => buildAdditionalCostPreview(data, percentageValid ? percentage : 0),
    [data, percentage, percentageValid]
  );

  const previewRows = useMemo(
    () =>
      preview.items
        .map((item) => ({
          ...item,
          schedule: data.schedules.find((schedule) => schedule.id === item.scheduleId),
          student: data.students.find((student) => student.id === item.studentId),
        }))
        .sort((a, b) => {
          const studentOrder = (a.student?.number ?? 999) - (b.student?.number ?? 999);
          return studentOrder || String(a.schedule?.endDate).localeCompare(String(b.schedule?.endDate));
        }),
    [data.schedules, data.students, preview.items]
  );

  async function handleApply() {
    if (!percentageValid || preview.items.length === 0) return;
    try {
      const result = await applyAdditionalCost(percentage, crypto.randomUUID());
      addAdditionalCostRun(
        dbAdditionalCostRunToAdditionalCostRun(result.run),
        result.items.map(dbAdditionalCostItemToAdditionalCostItem)
      );
      toast.success(`เพิ่มค่าใช้จ่าย ${money(result.run.additional_total)} บาท เรียบร้อยแล้ว`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เพิ่มค่าใช้จ่ายไม่สำเร็จ");
      throw error;
    }
  }

  return (
    <div className="fixed-page">
      <div className="fixed-page-header">
        <h1 className="section-title text-2xl sm:text-3xl md:text-4xl">ค่าใช้จ่ายเพิ่มเติม</h1>
        <p className="page-kicker">คำนวณและเพิ่มค่าปรับแบบเปอร์เซ็นต์ให้ผู้ที่ยังค้างชำระหลังวันครบกำหนด</p>
      </div>

      <div className="fixed-page-body space-y-4 sm:space-y-5">
        <section className="apple-card overflow-hidden p-4 sm:p-5" aria-labelledby="additional-cost-form-title">
          <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.55fr)]">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <BadgePercent className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="additional-cost-form-title" className="font-semibold">กำหนดเปอร์เซ็นต์</h2>
                  <p className="text-xs text-muted">รองรับทศนิยมและคำนวณใหม่ทันที</p>
                </div>
              </div>

              <label htmlFor="additional-cost-percentage" className="mb-1.5 block text-sm font-medium">
                ค่าใช้จ่ายเพิ่ม (%)
              </label>
              <div className="relative">
                <input
                  id="additional-cost-percentage"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={percentageInput}
                  onChange={(event) => setPercentageInput(event.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 pr-11 text-lg font-semibold"
                  aria-describedby="additional-cost-help additional-cost-error"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted">%</span>
              </div>
              <p id="additional-cost-help" className="mt-2 text-xs leading-5 text-muted">
                ระบบคิดทีละกำหนดการของนักเรียนแต่ละคน ปัดเป็น 2 ตำแหน่ง แล้วจึงรวมยอดทั้งหมด
              </p>
              {!percentageValid && percentageInput !== "" && (
                <p id="additional-cost-error" className="mt-1 text-xs font-medium text-rose-600">
                  กรุณาระบุเปอร์เซ็นต์มากกว่า 0 และไม่เกิน 100
                </p>
              )}

              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!percentageValid || preview.items.length === 0}
                className="apple-button pressable mt-4 min-h-11 w-full px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-45"
              >
                เพิ่มค่าใช้จ่ายตอนนี้
              </button>
            </div>

            <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryCard icon={<ReceiptText className="h-5 w-5" />} label="ยอดค้างก่อนเพิ่ม" value={`${money(preview.baseTotal)} ฿`} tone="blue" />
              <SummaryCard icon={<BadgePercent className="h-5 w-5" />} label="ค่าใช้จ่ายที่จะเพิ่ม" value={`${money(preview.additionalTotal)} ฿`} tone="amber" />
              <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="ยอดค้างหลังเพิ่ม" value={`${money(preview.grandTotal)} ฿`} tone="rose" />
              <div className="apple-soft flex items-center gap-3 rounded-2xl p-4 sm:col-span-2 xl:col-span-3">
                <UsersRound className="h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-sm">
                  พบ <strong>{preview.affectedStudentCount}</strong> คน รวม <strong>{preview.overdueItemCount}</strong> รายการค้างชำระ
                </p>
              </div>
              <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs leading-5 text-amber-900 sm:col-span-2 xl:col-span-3 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>การกดยืนยันแต่ละครั้งจะเพิ่มยอดจริง และครั้งถัดไปจะคำนวณจากยอดค้างล่าสุดรวมค่าใช้จ่ายที่เคยเพิ่มแล้ว</p>
              </div>
            </div>
          </div>
        </section>

        <section className="apple-card overflow-hidden" aria-labelledby="overdue-preview-title">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5" style={{ borderColor: "var(--line)" }}>
            <div>
              <h2 id="overdue-preview-title" className="font-semibold">ตัวอย่างรายการที่จะเพิ่ม</h2>
              <p className="mt-0.5 text-xs text-muted">ดึงเฉพาะกำหนดการที่เลยวันสิ้นสุดและยังมียอดค้าง</p>
            </div>
            <CalendarClock className="h-5 w-5 shrink-0 text-rose-500" />
          </div>

          {previewRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              {percentageValid ? "ไม่พบรายการค้างชำระที่เลยกำหนด" : "ระบุเปอร์เซ็นต์ที่ถูกต้องเพื่อดูตัวอย่าง"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b" style={{ borderColor: "var(--line)" }}>
                    <th className="px-4 py-3 font-medium sm:px-5">นักเรียน</th>
                    <th className="px-4 py-3 font-medium">กำหนดการ</th>
                    <th className="px-4 py-3 text-right font-medium">ยอดค้าง</th>
                    <th className="px-4 py-3 text-right font-medium">เพิ่ม {percentageValid ? percentage : 0}%</th>
                    <th className="px-4 py-3 text-right font-medium sm:px-5">ยอดใหม่</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((item) => (
                    <tr key={`${item.scheduleId}:${item.studentId}`} className="border-b last:border-0" style={{ borderColor: "var(--line)" }}>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="font-medium">เลขที่ {item.student?.number ?? "-"} {item.student?.firstName ?? "ไม่พบนักเรียน"}</div>
                        <div className="text-xs text-muted">{item.student?.lastName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.schedule?.name ?? "ไม่พบกำหนดการ"}</div>
                        <div className="text-xs text-muted">ครบกำหนด {formatThaiDate(item.schedule?.endDate)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(item.baseOutstanding)} ฿</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-600 dark:text-amber-400">+{money(item.additionalAmount)} ฿</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums sm:px-5">{money(item.totalAfterCharge)} ฿</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="apple-card overflow-hidden" aria-labelledby="additional-cost-history-title">
          <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: "var(--line)" }}>
            <h2 id="additional-cost-history-title" className="font-semibold">ประวัติการเพิ่มค่าใช้จ่าย</h2>
          </div>
          {data.additionalCostRuns.length === 0 ? (
            <div className="p-7 text-center text-sm text-muted">ยังไม่มีประวัติการเพิ่มค่าใช้จ่าย</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {data.additionalCostRuns.map((run) => (
                <article key={run.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-5">
                  <div>
                    <div className="font-medium">เพิ่ม {run.percentage.toLocaleString("th-TH")}%</div>
                    <div className="text-xs text-muted">{formatThaiDateTime(run.createdAt)}</div>
                  </div>
                  <div className="text-sm text-muted sm:text-right">
                    {run.affectedStudentCount} คน • {run.overdueItemCount} รายการ
                  </div>
                  <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-400 sm:min-w-28 sm:text-right">
                    +{money(run.additionalTotal)} ฿
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleApply}
        title="ยืนยันเพิ่มค่าใช้จ่าย"
        message={`เพิ่ม ${percentageValid ? percentage : 0}% เป็นเงิน ${money(preview.additionalTotal)} บาท ให้ ${preview.affectedStudentCount} คน (${preview.overdueItemCount} รายการ) การดำเนินการนี้จะเปลี่ยนยอดค้างจริง`}
        confirmText="ยืนยันเพิ่มค่าใช้จ่าย"
        confirmVariant="primary"
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "blue" | "amber" | "rose" }) {
  const toneClass = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  }[tone];
  return (
    <div className="apple-soft rounded-2xl p-4">
      <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
    </div>
  );
}

function formatThaiDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatThaiDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
