import { Suspense } from "react";
import { TransactionsList } from "@/components/transactions/TransactionsList";
import { TableRowSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function TransactionsListSkeleton() {
  return (
    <div className="rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-zinc-50/50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">วันที่</th>
              <th className="px-4 py-3 text-left text-sm font-medium">ประเภท</th>
              <th className="px-4 py-3 text-left text-sm font-medium">หมวดหมู่</th>
              <th className="px-4 py-3 text-left text-sm font-medium">รายละเอียด</th>
              <th className="px-4 py-3 text-right text-sm font-medium">จำนวน</th>
              <th className="px-4 py-3 text-left text-sm font-medium">วิธีชำระ</th>
              <th className="px-4 py-3 text-center text-sm font-medium">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            <TableRowSkeleton cols={7} />
            <TableRowSkeleton cols={7} />
            <TableRowSkeleton cols={7} />
            <TableRowSkeleton cols={7} />
            <TableRowSkeleton cols={7} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
      </div>
      <ErrorBoundary>
        <Suspense fallback={<TransactionsListSkeleton />}>
          <TransactionsList />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
