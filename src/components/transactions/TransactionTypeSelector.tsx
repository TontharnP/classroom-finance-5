import { Calendar, Receipt } from "lucide-react";

interface Props {
  onSelectSchedule: () => void;
  onSelectTransaction: () => void;
}

export function TransactionTypeSelector({ onSelectSchedule, onSelectTransaction }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        onClick={onSelectSchedule}
        className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-8 hover:border-blue-500 hover:bg-blue-100/50 dark:border-blue-700 dark:bg-blue-950/20 dark:hover:border-blue-600"
      >
        <Calendar className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        <div className="text-center">
          <div className="font-semibold">กำหนดการ</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">เก็บเงินจากนักเรียน</div>
        </div>
      </button>

      <button
        onClick={onSelectTransaction}
        className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-8 hover:border-emerald-500 hover:bg-emerald-100/50 dark:border-emerald-700 dark:bg-emerald-950/20 dark:hover:border-emerald-600"
      >
        <Receipt className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
        <div className="text-center">
          <div className="font-semibold">ธุรกรรม</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">รายรับ/รายจ่ายทั่วไป</div>
        </div>
      </button>
    </div>
  );
}
