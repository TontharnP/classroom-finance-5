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
    blue: "from-blue-500/20",
    emerald: "from-emerald-500/20",
    rose: "from-rose-500/20",
    amber: "from-amber-500/20",
    indigo: "from-indigo-500/20",
};

export function PocketCard({ pocket, onTransfer, onEdit, onDetails }: Props) {
    const data = useAppStore((state) => state.data);
    const balance = useMemo(() => calculatePocketBalance(data, pocket.id), [data, pocket.id]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "apple-card hover-lift relative min-w-0 overflow-hidden bg-gradient-to-br to-transparent p-4 transition-all sm:p-5",
                BG_COLORS[pocket.color] || "from-zinc-500/10"
            )}
        >
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg", COLORS[pocket.color] || "bg-zinc-500")}>
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate font-semibold" title={pocket.name}>{pocket.name}</div>
                        {pocket.isDefault && <div className="text-xs text-muted font-medium">กระเป๋าหลัก</div>}
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <div className="text-balance-safe text-xl font-black tracking-tight sm:text-2xl">{balance.toLocaleString()} ฿</div>
                <div className="text-sm text-muted">ยอดคงเหลือ</div>
            </div>

            <div className="mt-4 grid gap-2 min-[360px]:grid-cols-2">
                <button
                    onClick={() => onTransfer(pocket)}
                    className="apple-ghost-button flex-1 px-3 py-2 text-sm"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    โอนย้าย
                </button>
                <button
                    onClick={() => onEdit(pocket)}
                    className="apple-ghost-button flex-1 px-3 py-2 text-sm"
                >
                    <Edit2 className="h-3.5 w-3.5" />
                    แก้ไข
                </button>
            </div>
            <button
                onClick={() => onDetails(pocket)}
                className="apple-ghost-button mt-2 w-full px-3 py-2 text-sm"
            >
                ดูรายการ
            </button>
        </motion.div>
    );
}
