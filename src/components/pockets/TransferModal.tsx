"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { Pocket } from "@/types";
import { createTransaction } from "@/lib/supabase/transactions";
import { dbTransactionToTransaction } from "@/lib/supabase/adapter";
import toast from "react-hot-toast";
import { calculatePocketBalance } from "@/lib/calculations";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    sourcePocket: Pocket;
}

export function TransferModal({ isOpen, onClose, sourcePocket }: Props) {
    const data = useAppStore((state) => state.data);
    const addTransaction = useAppStore((state) => state.addTransaction);

    const [targetPocketId, setTargetPocketId] = useState<string>("");
    const [amount, setAmount] = useState<number | "">("");

    // Filter out source pocket from targets
    const targetPockets = data.pockets.filter((p) => p.id !== sourcePocket.id);

    const sourceBalance = calculatePocketBalance(data, sourcePocket.id);

    const handleTransfer = async () => {
        if (!targetPocketId) {
            toast.error("กรุณาเลือกปลายทาง");
            return;
        }
        const val = Number(amount);
        if (!val || val <= 0) {
            toast.error("กรุณาระบุจำนวนเงิน");
            return;
        }
        if (val > sourceBalance) {
            toast.error("ยอดเงินไม่พอ");
            return;
        }

        try {
            const targetPocket = data.pockets.find((p) => p.id === targetPocketId);
            const created = await createTransaction({
                name: `โอนเงินไป ${targetPocket?.name}`,
                kind: "transfer",
                amount: val,
                method: undefined,
                category: "การโอนย้าย",
                description: `จาก ${sourcePocket.name} ไปยัง ${targetPocket?.name}`,
                source: "transaction",
                schedule_id: undefined,
                student_id: undefined,
                source_pocket_id: sourcePocket.id,
                destination_pocket_id: targetPocketId,
            });

            addTransaction(dbTransactionToTransaction(created));
            toast.success("โอนเงินสำเร็จ");
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="โอนย้ายเงิน">
            <div className="space-y-4">
                <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                    <div className="text-sm text-zinc-500">ต้นทาง</div>
                    <div className="font-semibold">{sourcePocket.name}</div>
                    <div className="text-xs text-zinc-500">คงเหลือ: {sourceBalance.toLocaleString()} ฿</div>
                </div>

                <div className="flex justify-center">
                    <span className="text-zinc-400">↓</span>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">ปลายทาง</label>
                    <select
                        value={targetPocketId}
                        onChange={(e) => setTargetPocketId(e.target.value)}
                        className="w-full rounded-md border px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                    >
                        <option value="">-- เลือกกระเป๋า --</option>
                        {targetPockets.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">จำนวนเงิน</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full rounded-md border px-3 py-2 dark:bg-zinc-800 dark:border-zinc-700"
                        placeholder="0.00"
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">ยกเลิก</button>
                    <button onClick={handleTransfer} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">ยืนยัน</button>
                </div>
            </div>
        </Modal>
    );
}
