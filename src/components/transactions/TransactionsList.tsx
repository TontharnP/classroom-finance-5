"use client";
import { useState, useMemo, memo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { filterTransactions } from "@/lib/calculations";
import { TxnSource, TxnKind, PaymentMethod, Transaction } from "@/types";
import { format } from "date-fns";
import { AddTransactionModal } from "./AddTransactionModal";
import { EditTransactionModal } from "./EditTransactionModal";
import { TransactionDetailModal } from "./TransactionDetailModal";
import toast from "react-hot-toast";

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
    <motion.tr
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-zinc-50/70 active:bg-zinc-100 dark:hover:bg-zinc-900/40 dark:active:bg-zinc-800/50"
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
    </motion.tr>
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
    setCurrentPage(1);
  }, [source, kind, method, debouncedSearch]);

  const filtered = useMemo(() => {
    return filterTransactions(data.transactions, {
      source: source || undefined,
      kind: kind || undefined,
      method: method || undefined,
      search: debouncedSearch || undefined,
      students: data.students,
    });
  }, [data.transactions, source, kind, method, debouncedSearch]);

  return (
    <div className="space-y-4">
      {/* Tabs + Filters */}
      <div className="flex flex-wrap gap-3 rounded-xl border bg-white/50 p-4 dark:bg-black/20">
        {/* Tabs */}
        <div className="flex items-center gap-2">
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
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors border
                ${activeTab === tab.key ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              aria-label={tab.label}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as TxnKind | "")}
          className="rounded-md border px-3 py-1.5 text-sm"
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
          className="rounded-md border px-3 py-1.5 text-sm"
          aria-label="ประเภทการชำระ"
        >
          <option value="">ทุกประเภทการชำระ</option>
          <option value="kplus">K PLUS</option>
          <option value="cash">เงินสด</option>
          <option value="truemoney">TrueMoney</option>
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="ค้นหา (ชื่อ, ยอดเงิน, หมวดหมู่...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border py-1.5 pl-9 pr-3 text-sm"
            aria-label="ค้นหา"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
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
            className="rounded-md border px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="ล้างตัวกรอง"
          >
            รีเซ็ต
          </button>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Statement Table / List */}
      <div className="rounded-xl border bg-white dark:bg-black/20 overflow-hidden">
        {/* Mobile View (Cards) */}
        <div className="block md:hidden divide-y dark:divide-zinc-800">
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
                <div key={t.id} onClick={() => setSelectedTransaction(t)} className="p-4 active:bg-zinc-50 dark:active:bg-zinc-900/50">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col">
                      <div className="font-medium text-sm">{t.name}</div>
                      {transferInfo && (
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{transferInfo.src}</span>
                          <span>→</span>
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{transferInfo.dest}</span>
                        </div>
                      )}
                    </div>
                    <div className={`font-semibold text-sm ${kindClass}`}>
                      {t.kind === "income" ? "+" : t.kind === "transfer" ? "" : "-"}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </div>
                  </div>
                  <div className="flex justify-between items-end text-xs text-zinc-500 dark:text-zinc-400">
                    <div>
                      <div>{payer}</div>
                      <div>{format(new Date(t.createdAt), "dd/MM/yy HH:mm")}</div>
                    </div>
                    <div className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded capitalize">
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
          <table className="w-full text-sm">
            <thead className="border-b bg-zinc-50 text-left dark:bg-zinc-900/50">
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
                          <div className="text-sm">กดปุ่ม "เพิ่ม" เพื่อสร้างรายการรายรับ/รายจ่ายใหม่</div>
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span>แสดง</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded border bg-white px-2 py-1 dark:bg-zinc-900 dark:border-zinc-700"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>รายการต่อหน้า</span>
          </div>

          <div className="flex items-center gap-4">
            <span>
              หน้า {currentPage} จาก {Math.ceil(filtered.length / itemsPerPage)} (ทั้งหมด {filtered.length} รายการ)
            </span>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="rounded px-3 py-1 border hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                ก่อนหน้า
              </button>
              <button
                disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage)}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filtered.length / itemsPerPage), prev + 1))}
                className="rounded px-3 py-1 border hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:hover:bg-zinc-800"
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
