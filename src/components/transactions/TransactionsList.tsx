"use client";
import { useState, useMemo, memo, useCallback, useEffect } from "react";
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
  onClick,
}: {
  transaction: Transaction;
  payer: string;
  onClick: () => void;
}) => {
  const kindClass = transaction.kind === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  return (
    <motion.tr
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-zinc-50/70 active:bg-zinc-100 dark:hover:bg-zinc-900/40 dark:active:bg-zinc-800/50"
    >
      <td className="px-4 py-3">{transaction.name}</td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{payer}</td>
      <td className={`px-4 py-3 text-right font-semibold ${kindClass}`}>
        {transaction.kind === "income" ? "+" : "-"}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
      </td>
      <td className="px-4 py-3 capitalize">{transaction.method || "-"}</td>
      <td className="px-4 py-3">{transaction.source === "schedule" ? "-" : (transaction.category || "-")}</td>
      <td className="px-4 py-3 text-zinc-500">{format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm")}</td>
    </motion.tr>
  );
});
TransactionRow.displayName = "TransactionRow";

export function TransactionsList() {
  const data = useAppStore((state) => state.data);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  // tabSource: undefined = ทั้งหมด (รายการธุรกรรม + กำหนดการ), otherwise filter
  const [source, setSource] = useState<TxnSource | "">("");
  const [activeTab, setActiveTab] = useState<"transaction" | "schedule" | "all">("all");
  const [kind, setKind] = useState<TxnKind | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [search, setSearch] = useState("");
  
  // Debounce search input to reduce re-renders
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return filterTransactions(data.transactions, {
      source: source || undefined,
      kind: kind || undefined,
      method: method || undefined,
      search: debouncedSearch || undefined,
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
            { key: "all", label: "ทั้งหมด" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as typeof activeTab);
                setSource(tab.key === "all" ? "" : (tab.key as TxnSource));
                if (tab.key === "schedule") {
                  // schedule transactions are always income; clear kind if expense selected
                  setKind("income");
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
            placeholder="ค้นหารายการ..."
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

      {/* Statement Table */}
      <div className="overflow-x-auto rounded-xl border bg-white dark:bg-black/20">
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
              filtered.map((t) => {
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
                    onClick={() => setSelectedTransaction(t)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
