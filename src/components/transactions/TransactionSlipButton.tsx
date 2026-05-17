"use client";

import { ReceiptText } from "lucide-react";
import type { Transaction } from "@/types";

type Props = {
  transaction: Pick<Transaction, "slipUrl" | "slipPathname">;
  label?: boolean;
  className?: string;
};

export function transactionSlipUrl(transaction: Pick<Transaction, "slipUrl" | "slipPathname">) {
  if (transaction.slipUrl) return transaction.slipUrl;
  if (transaction.slipPathname) return `/api/uploads/slips?path=${encodeURIComponent(transaction.slipPathname)}`;
  return null;
}

export function TransactionSlipButton({ transaction, label = false, className = "" }: Props) {
  const slipUrl = transactionSlipUrl(transaction);
  const isDisabled = !slipUrl;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={(event) => {
        if (isDisabled) return;
        event.stopPropagation();
        window.open(slipUrl, "_blank", "noopener,noreferrer");
      }}
      className={`${label ? "apple-ghost-button h-9 px-3 py-2 text-sm" : "apple-icon-button h-8 w-8 rounded-xl"} ${isDisabled ? "opacity-45" : ""} ${className}`}
      aria-label={isDisabled ? "ไม่มีสลิป" : "ดูสลิป"}
      title={isDisabled ? "ไม่มีสลิป" : "ดูสลิป"}
    >
      <ReceiptText className={`h-4 w-4 ${isDisabled ? "text-zinc-400 dark:text-zinc-500" : "text-emerald-600 dark:text-emerald-400"}`} />
      {label && <span>{isDisabled ? "ไม่มีสลิป" : "ดูสลิป"}</span>}
    </button>
  );
}
