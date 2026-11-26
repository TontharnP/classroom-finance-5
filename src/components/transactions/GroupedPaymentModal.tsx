"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { QRCodeCanvas } from "qrcode.react";
import generatePayload from "promptpay-qr";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { roundMoney } from "@/lib/additionalCosts";
import { useAppStore } from "@/lib/store";
import { dbTransactionToTransaction } from "@/lib/supabase/adapter";
import { getGroupedScheduleBalances, recordGroupedSchedulePayment } from "@/lib/supabase/transactions";

const PROMPTPAY_ID = "004666006046829";
const formatMoney = (amount: number) => amount.toLocaleString("th-TH", { maximumFractionDigits: 2 });
type Method = Parameters<typeof recordGroupedSchedulePayment>[0]["method"];

export function GroupedPaymentModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const data = useAppStore((state) => state.data);
  const addTransaction = useAppStore((state) => state.addTransaction);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [method, setMethod] = useState<Method>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ key: string; payload: string } | null>(null);
  const inFlight = useRef(false);

  const student = data.students.find((item) => item.id === studentId);
  const { data: unpaid = [], error: loadError, isLoading, mutate } = useSWR(
    ["grouped-schedule-balances", studentId],
    ([, id]) => getGroupedScheduleBalances(id),
    { revalidateOnFocus: false }
  );
  const selected = unpaid.filter((item) => selectedIds.includes(item.id));
  const total = roundMoney(selected.reduce((sum, item) => sum + item.amount, 0));
  const allSelected = unpaid.length > 0 && selected.length === unpaid.length;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.length < 2 || inFlight.current) return;
    const payment = {
      studentId,
      method,
      pocketId: data.pockets.find((pocket) => pocket.id === `pocket-${method}`)?.id
        ?? data.pockets.find((pocket) => pocket.isDefault)?.id,
      allocations: selected.map(({ id, amount }) => ({ schedule_id: id, amount })),
    };
    const payload = JSON.stringify(payment);
    if (attempt.current?.payload !== payload) attempt.current = { key: crypto.randomUUID(), payload };
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      const transactions = await recordGroupedSchedulePayment({ ...payment, requestKey: attempt.current.key });
      transactions.forEach((transaction) => addTransaction(dbTransactionToTransaction(transaction)));
      toast.success(`บันทึกชำระ ${transactions.length} รายการ รวม ${formatMoney(total)} บาท`);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "บันทึกการชำระเงินไม่สำเร็จ");
      void mutate();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!inFlight.current) onClose(); }} title="ชำระหลายรายการ">
      <form onSubmit={handleSubmit} className="space-y-4">
        {student && <p className="text-sm text-muted">เลขที่ {student.number} {student.firstName} {student.lastName}</p>}
        <fieldset disabled={submitting || isLoading || Boolean(loadError)} className="space-y-2">
          <legend className="mb-2 text-sm font-medium">เลือกรายการที่ต้องการชำระเต็มยอดค้าง</legend>
          {loadError ? (
            <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">โหลดยอดค้างไม่สำเร็จ</p>
          ) : isLoading ? (
            <p className="text-sm text-muted" role="status">กำลังโหลดยอดค้าง...</p>
          ) : unpaid.length > 0 ? (
            <>
              <label className="flex items-center gap-3 px-3 py-2 text-sm">
                <input type="checkbox" checked={allSelected}
                  onChange={() => setSelectedIds(allSelected ? [] : unpaid.map(({ id }) => id))} />
                เลือกทั้งหมด
              </label>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {unpaid.map((item) => (
                  <label key={item.id} className="apple-soft flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm">
                    <input type="checkbox" checked={selectedIds.includes(item.id)}
                      onChange={() => setSelectedIds((ids) => ids.includes(item.id)
                        ? ids.filter((id) => id !== item.id) : [...ids, item.id])} />
                    <span className="min-w-0 flex-1 break-words">{item.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatMoney(item.amount)} ฿</span>
                  </label>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-muted">ไม่มีรายการค้างชำระ</p>}
        </fieldset>
        <div className="apple-soft flex items-center justify-between gap-3 rounded-xl px-3 py-2" aria-live="polite">
          <span className="text-sm">ยอดชำระรวม {selected.length} รายการ</span>
          <strong className="tabular-nums">{formatMoney(total)} ฿</strong>
        </div>
        <label className="block text-sm font-medium">
          ช่องทางชำระ
          <select value={method} disabled={submitting} onChange={(event) => setMethod(event.target.value as Method)}
            className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="cash">เงินสด</option>
            <option value="kplus">K PLUS / โอนธนาคาร</option>
            <option value="truemoney">TrueMoney</option>
          </select>
        </label>
        {method === "kplus" && !loadError && selected.length >= 2 && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 text-zinc-900">
            <QRCodeCanvas value={generatePayload(PROMPTPAY_ID, { amount: total })} size={180} marginSize={4}
              title={`PromptPay ยอดรวม ${formatMoney(total)} บาท`} />
            <span className="text-sm font-medium">สแกนจ่าย {formatMoney(total)} ฿</span>
          </div>
        )}
        {error && <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
        <button type="submit" disabled={submitting || Boolean(loadError) || selected.length < 2}
          className="apple-button w-full justify-center px-4 py-2 disabled:opacity-45">
          {submitting ? "กำลังบันทึก..." : "ยืนยันรับชำระ"}
        </button>
      </form>
    </Modal>
  );
}
