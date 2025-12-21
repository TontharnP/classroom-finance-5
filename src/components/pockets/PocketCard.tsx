"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Pocket } from "@/types";
import { useAppStore } from "@/lib/store";
import { calculatePocketBalance } from "@/lib/calculations";
import { Wallet, RefreshCw, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    pocket: Pocket;
    onTransfer: (pocket: Pocket) => void;
    onEdit: (pocket: Pocket) => void;
    onDetails: (pocket: Pocket) => void;
}

const COLORS: Record<string, string> = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    indigo: "bg-indigo-500",
};

const BG_COLORS: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-200 dark:border-blue-900",
    emerald: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900",
    rose: "bg-rose-500/10 border-rose-200 dark:border-rose-900",
    amber: "bg-amber-500/10 border-amber-200 dark:border-amber-900",
    indigo: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-900",
};

export function PocketCard({ pocket, onTransfer, onEdit, onDetails }: Props) {
    const data = useAppStore((state) => state.data);
    const balance = useMemo(() => calculatePocketBalance(data, pocket.id), [data, pocket.id]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-md",
                BG_COLORS[pocket.color] || "bg-zinc-50 border-zinc-200"
            )}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white", COLORS[pocket.color] || "bg-zinc-500")}>
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{pocket.name}</div>
                        {pocket.isDefault && <div className="text-xs text-zinc-500 font-medium">กระเป๋าหลัก</div>}
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <div className="text-2xl font-bold">{balance.toLocaleString()} ฿</div>
                <div className="text-sm text-zinc-500">ยอดคงเหลือ</div>
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={() => onTransfer(pocket)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/50 px-3 py-2 text-sm font-medium hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    โอนย้าย
                </button>
                <button
                    onClick={() => onEdit(pocket)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/50 px-3 py-2 text-sm font-medium hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40"
                >
                    <Edit2 className="h-3.5 w-3.5" />
                    แก้ไข
                </button>
            </div>
            <button
                onClick={() => onDetails(pocket)}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-white/30 px-3 py-2 text-sm font-medium hover:bg-white/50 dark:bg-black/10 dark:hover:bg-black/30"
            >
                ดูรายการ
            </button>
        </motion.div>
    );
}
