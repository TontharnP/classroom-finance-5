"use client";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { Transaction, Pocket } from "@/types";
import { useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    pocket: Pocket;
}

export function PocketTransactionsModal({ isOpen, onClose, pocket }: Props) {
    const data = useAppStore((state) => state.data);

    const transactions = useMemo(() => {
        // Logic must match calculatePocketBalance
        const methodMap: Record<string, string> = {
            "pocket-kplus": "kplus",
            "pocket-cash": "cash",
            "pocket-truemoney": "truemoney",
        };
        const targetMethod = methodMap[pocket.id];

        return data.transactions
            .filter((t) => {
                // 1. Direct linkage
                if (t.pocketId === pocket.id) return true;
                // 2. Transfers linking to this pocket
                if (t.kind === "transfer" && (t.sourcePocketId === pocket.id || t.destinationPocketId === pocket.id)) return true;
                // 3. Fallback method match (if not transfer)
                if (targetMethod && t.method === targetMethod && !t.pocketId && t.kind !== "transfer") return true;

                return false;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [data.transactions, pocket.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`รายการใน ${pocket.name}`}>
            <div className="space-y-4">
                {transactions.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500">ไม่มีรายการ</div>
                ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {transactions.map((t) => (
                            <div key={t.id} className="flex items-center justify-between rounded-lg border p-3 text-sm dark:border-zinc-700">
                                <div>
                                    <div className="font-medium">{t.name}</div>
                                    {t.studentId && (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                            จ่ายโดย: {data.students.find(s => s.id === t.studentId)?.firstName} ({data.students.find(s => s.id === t.studentId)?.nickName})
                                        </div>
                                    )}
                                    <div className="text-xs text-zinc-500">
                                        {format(new Date(t.createdAt), "d MMM yyyy HH:mm", { locale: th })}
                                    </div>
                                    {t.kind === "transfer" && (
                                        <div className="text-[10px] text-zinc-500 mt-0.5">
                                            {t.sourcePocketId === pocket.id
                                                ? `โอนไป: ${data.pockets.find(p => p.id === t.destinationPocketId)?.name || 'ไม่ทราบ'}`
                                                : `รับจาก: ${data.pockets.find(p => p.id === t.sourcePocketId)?.name || 'ไม่ทราบ'}`
                                            }
                                        </div>
                                    )}
                                </div>
                                <div className={`font-mono font-medium ${t.kind === "income" || (t.kind === "transfer" && t.destinationPocketId === pocket.id)
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                    }`}>
                                    {t.kind === "income" || (t.kind === "transfer" && t.destinationPocketId === pocket.id) ? "+" : "-"}
                                    {t.amount.toLocaleString()} ฿
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
