"use client";
import { useState, useMemo } from "react";
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
    pocket: Pocket;
}

export function EditPocketModal({ isOpen, onClose, pocket }: Props) {
    const data = useAppStore((state) => state.data);
    const addTransaction = useAppStore((state) => state.addTransaction);

    const currentBalance = useMemo(() => calculatePocketBalance(data, pocket.id), [data, pocket.id]);
    const [newTotal, setNewTotal] = useState<number | "">("");

    const handleSave = async () => {
        const val = Number(newTotal);
        if (newTotal === "" || isNaN(val)) {
            toast.error("กรุณาระบุยอดเงิน");
            return;
        }

        const diff = val - currentBalance;
        if (diff === 0) {
            onClose();
            return;
        }

        const kind = diff > 0 ? "income" : "expense";
        const amount = Math.abs(diff);

        try {
            const created = await createTransaction({
                name: "ปรับปรุงยอดเงิน (Manual)",
                kind,
                amount,
                method: undefined, // System adjustment
                category: "ปรับปรุงยอด",
                description: `แก้ไขยอด ${pocket.name} จาก ${currentBalance} เป็น ${val}`,
                source: "transaction",
                schedule_id: undefined,
                student_id: undefined,
                pocket_id: pocket.id, // Direct adjustment to pocket
            });

            addTransaction(dbTransactionToTransaction(created));
            toast.success("บันทึกยอดเงินใหม่แล้ว");
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`แก้ไขยอดเงิน: ${pocket.name}`}>
            <div className="space-y-4">
                <div className="text-center py-2">
                    <div className="text-sm text-zinc-500">ยอดปัจจุบัน</div>
                    <div className="text-3xl font-bold">{currentBalance.toLocaleString()} ฿</div>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">ยอดเงินที่ต้องการ (บาท)</label>
                    <input
                        type="number"
                        value={newTotal}
                        onChange={(e) => setNewTotal(Number(e.target.value))}
                        className="w-full text-center text-xl font-medium rounded-md border px-3 py-3 dark:bg-zinc-800 dark:border-zinc-700"
                        placeholder={currentBalance.toString()}
                    />
                    <p className="mt-2 text-xs text-zinc-500 text-center">ระบบจะสร้างรายการปรับปรุงยอดโดยอัตโนมัติ</p>
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">ยกเลิก</button>
                    <button onClick={handleSave} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </Modal>
    );
}
