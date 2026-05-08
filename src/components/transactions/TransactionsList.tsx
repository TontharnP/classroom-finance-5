"use client";
import { useState, useMemo, memo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { filterTransactions } from "@/lib/calculations";
import { TxnSource, TxnKind, PaymentMethod, Transaction } from "@/types";
import { format } from "date-fns";
import { AddTransactionModal } from "./AddTransactionModal";
import { EditTransactionModal } from "./EditTransactionModal";
import { TransactionDetailModal } from "./TransactionDetailModal";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const TransactionRow = memo(({
  transaction,
  payer,
  pockets,
  onClick,
}: {
  transaction: Transaction;
  payer: string;
  pockets: import("@/types").Pocket[];
  onClick: () => void;
}) => {
  const kindClass = transaction.kind === "income" ? "text-emerald-600 dark:text-emerald-400" : transaction.kind === "transfer" ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400";

  const transferInfo = useMemo(() => {
    if (transaction.kind !== "transfer") return null;
    const src = pockets.find(p => p.id === transaction.sourcePocketId)?.name || "ไม่ทราบ";
    const dest = pockets.find(p => p.id === transaction.destinationPocketId)?.name || "ไม่ทราบ";
    return { src, dest };
  }, [transaction, pockets]);

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-white/65 active:bg-white/80 dark:hover:bg-white/5 dark:active:bg-white/10"
      style={{ borderColor: "var(--line)" }}
    >
      <td className="px-4 py-3">
        <div>{transaction.name}</div>
        {transferInfo && (
          <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
            <span className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{transferInfo.src}</span>
            <span>→</span>
            <span className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{transferInfo.dest}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{payer}</td>
      <td className={`px-4 py-3 text-right font-semibold ${kindClass}`}>
        {transaction.kind === "income" ? "+" : transaction.kind === "transfer" ? "" : "-"}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
      </td>
      <td className="px-4 py-3 capitalize">
        {transaction.kind === "transfer" ? "Internal" : (transaction.method || "-")}
      </td>
      <td className="px-4 py-3">{transaction.kind === "transfer" ? "โอนย้าย" : (transaction.source === "schedule" ? "-" : (transaction.category || "-"))}</td>
      <td className="px-4 py-3 text-zinc-500">{format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm")}</td>
    </tr>
  );
});
TransactionRow.displayName = "TransactionRow";

export function TransactionsList() {
  const searchParams = useSearchParams();
  const data = useAppStore((state) => state.data);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Initialize from URL params
  const urlSource = searchParams.get("source") as TxnSource | null;
  const urlKind = searchParams.get("kind") as TxnKind | null;
  const urlMethod = searchParams.get("method") as PaymentMethod | null;

  const [source, setSource] = useState<TxnSource | "">(urlSource || "");
  const [kind, setKind] = useState<TxnKind | "">(urlKind || "");
  const [method, setMethod] = useState<PaymentMethod | "">(urlMethod || "");
  const [search, setSearch] = useState("");

  // Determine active tab based on URL params
  const initialTab = urlKind === "transfer" ? "transfer" : urlSource === "schedule" ? "schedule" : urlSource === "transaction" ? "transaction" : "all";
  const [activeTab, setActiveTab] = useState<"transaction" | "schedule" | "transfer" | "all">(initialTab);

  // Debounce search input to reduce re-renders
  const debouncedSearch = useDebounce(search, 300);

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filter changes
  useEffect(() => {
    queueMicrotask(() => setCurrentPage(1));
  }, [source, kind, method, debouncedSearch]);

  const filtered = useMemo(() => {
    return filterTransactions(data.transactions, {
      source: source || undefined,
      kind: kind || undefined,
      method: method || undefined,
      search: debouncedSearch || undefined,
      students: data.students,
    });
  }, [data.transactions, data.students, source, kind, method, debouncedSearch]);

  return (
    <div className="min-w-0 space-y-4">
      {/* Tabs + Filters */}
      <div className="apple-card flex min-w-0 flex-col gap-3 p-3 sm:p-4">
        {/* Tabs */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {[
            { key: "transaction", label: "รายการธุรกรรม" },
            { key: "schedule", label: "รายการกำหนดการ" },
            { key: "transfer", label: "โอนย้ายภายใน" },
            { key: "all", label: "ทั้งหมด" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as typeof activeTab);
                if (tab.key === "transfer") {
                  setSource("transaction");
                  setKind("transfer");
                } else {
                  setSource(tab.key === "all" ? "" : (tab.key as TxnSource));
                  if (tab.key === "schedule") {
                    setKind("income");
                  } else {
                    // Reset kind if it was transfer but switched to transaction/all
                    if (kind === "transfer") setKind("");
                  }
                }
              }}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition-colors
                ${activeTab === tab.key ? "border-transparent text-white" : "text-muted hover:bg-white/50 dark:hover:bg-white/5"}`}
              style={activeTab === tab.key ? { background: "var(--primary)" } : { borderColor: "var(--line)" }}
              aria-label={tab.label}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[160px_190px_minmax(220px,1fr)_auto]">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as TxnKind | "")}
            className="rounded-full border px-3 py-2 text-sm"
            aria-label="รายรับ/รายจ่าย"
            disabled={activeTab === "schedule"}
          >
            <option value="">รายรับ/รายจ่าย</option>
            <option value="income">รายรับ</option>
            {activeTab !== "schedule" && <option value="expense">รายจ่าย</option>}
            {activeTab !== "schedule" && <option value="transfer">โอนย้าย</option>}
          </select>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}
            className="rounded-full border px-3 py-2 text-sm"
            aria-label="ประเภทการชำระ"
          >
            <option value="">ทุกประเภทการชำระ</option>
            <option value="kplus">K PLUS</option>
            <option value="cash">เงินสด</option>
            <option value="truemoney">TrueMoney</option>
          </select>

          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="ค้นหา (ชื่อ, ยอดเงิน, หมวดหมู่...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border py-2 pl-10 pr-3 text-sm"
              aria-label="ค้นหา"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:col-span-2 xl:col-span-1 xl:flex xl:items-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="apple-button px-4 py-2 text-sm"
            aria-label="เพิ่มรายการ"
          >
            <Plus className="h-4 w-4" />
            เพิ่ม
          </button>
          <button
            onClick={() => {
              setActiveTab("transaction");
              setSource("transaction");
              setKind("");
              setMethod("");
              setSearch("");
            }}
            className="apple-ghost-button px-4 py-2 text-sm"
            aria-label="ล้างตัวกรอง"
          >
            รีเซ็ต
          </button>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Statement Table / List */}
      <div className="polished-table min-w-0">
        {/* Mobile View (Cards) */}
        <div className="block divide-y md:hidden" style={{ borderColor: "var(--line)" }}>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              ไม่พบรายการ
            </div>
          ) : (
            filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((t) => {
              const payer = t.source === "schedule"
                ? (() => {
                  const stu = data.students.find((s) => s.id === t.studentId);
                  if (!stu) return "นักเรียน";
                  const full = `${stu.prefix}${stu.firstName} ${stu.lastName}`.trim();
                  return full.length > 1 ? full : "นักเรียน";
                })()
                : "เหรัญญิก";
              const kindClass = t.kind === "income" ? "text-emerald-600 dark:text-emerald-400" : t.kind === "transfer" ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400";
              const transferInfo = t.kind === "transfer" ? {
                src: data.pockets.find(p => p.id === t.sourcePocketId)?.name || "ไม่ทราบ",
                dest: data.pockets.find(p => p.id === t.destinationPocketId)?.name || "ไม่ทราบ"
              } : null;

              return (
                <div key={t.id} onClick={() => setSelectedTransaction(t)} className="min-w-0 p-3 active:bg-white/60 dark:active:bg-white/5 min-[390px]:p-4">
                  <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="flex min-w-0 flex-col">
                      <div className="truncate text-sm font-medium" title={t.name}>{t.name}</div>
                      {transferInfo && (
                        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-zinc-500">
                          <span className="truncate rounded bg-zinc-100 px-1 dark:bg-zinc-800">{transferInfo.src}</span>
                          <span>→</span>
                          <span className="truncate rounded bg-zinc-100 px-1 dark:bg-zinc-800">{transferInfo.dest}</span>
                        </div>
                      )}
                    </div>
                    <div className={`whitespace-nowrap text-right text-sm font-semibold ${kindClass}`}>
                      {t.kind === "income" ? "+" : t.kind === "transfer" ? "" : "-"}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="min-w-0">
                      <div>{payer}</div>
                      <div>{format(new Date(t.createdAt), "dd/MM/yy HH:mm")}</div>
                    </div>
                    <div className="rounded bg-zinc-100 px-2 py-1 capitalize dark:bg-zinc-800">
                      {t.kind === "transfer" ? "Internal" : t.method}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="border-b text-left" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--panel-soft) 90%, transparent)" }}>
              <tr>
                <th className="px-4 py-3 font-medium">ชื่อรายการ</th>
                <th className="px-4 py-3 font-medium">ผู้ชำระ</th>
                <th className="px-4 py-3 font-medium text-right">จำนวนเงิน</th>
                <th className="px-4 py-3 font-medium">ประเภทการชำระ</th>
                <th className="px-4 py-3 font-medium">หมวดหมู่</th>
                <th className="px-4 py-3 font-medium">วันที่</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="text-zinc-500 dark:text-zinc-400">
                      {data.transactions.length === 0 ? (
                        <div>
                          <div className="mb-2 text-lg font-medium">ยังไม่มีรายการธุรกรรม</div>
              <div className="text-sm">กดปุ่ม &quot;เพิ่ม&quot; เพื่อสร้างรายการรายรับ/รายจ่ายใหม่</div>
                        </div>
                      ) : (
                        "ไม่พบรายการที่ตรงกับการค้นหา — ลองปรับตัวกรองหรือคำค้นหา"
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((t) => {
                  const payer = t.source === "schedule"
                    ? (() => {
                      const stu = data.students.find((s) => s.id === t.studentId);
                      if (!stu) return "นักเรียน";
                      const full = `${stu.prefix}${stu.firstName} ${stu.lastName}`.trim();
                      return full.length > 1 ? full : "นักเรียน";
                    })()
                    : "เหรัญญิก";
                  return (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      payer={payer}
                      pockets={data.pockets}
                      onClick={() => setSelectedTransaction(t)}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="flex flex-col items-stretch justify-between gap-3 py-2 text-sm text-muted lg:flex-row lg:items-center">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <span>แสดง</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-full border px-3 py-1.5"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>รายการต่อหน้า</span>
          </div>

          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <span className="text-center">
              หน้า {currentPage} จาก {Math.ceil(filtered.length / itemsPerPage)} (ทั้งหมด {filtered.length} รายการ)
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="apple-ghost-button px-3 py-1 text-sm disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <button
                disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage)}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filtered.length / itemsPerPage), prev + 1))}
                className="apple-ghost-button px-3 py-1 text-sm disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedTransaction && selectedTransaction.source === "transaction" && (
        <EditTransactionModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
        />
      )}
      {selectedTransaction && selectedTransaction.source === "schedule" && (
        <TransactionDetailModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
}
