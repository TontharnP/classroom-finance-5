import { DataBundle, Transaction } from "@/types";

interface BalanceSummary {
  balance: number;
  incomeTxn: number;
  expenseTxn: number;
  studentIncome: { kplus: number; cash: number; truemoney: number; total: number };
}

export function calculateBalance(data: DataBundle): BalanceSummary {
  let incomeTxn = 0;
  let expenseTxn = 0;
  let kplus = 0,
    cash = 0,
    truemoney = 0;
  let scheduleKplus = 0,
    scheduleCash = 0,
    scheduleTruemoney = 0;

  data.transactions.forEach((t) => {
    if (t.source === "transaction") {
      if (t.kind === "income") {
        incomeTxn += t.amount;
        // Include normal transaction income in method breakdown
        if (t.method === "kplus") kplus += t.amount;
        else if (t.method === "cash") cash += t.amount;
        else if (t.method === "truemoney") truemoney += t.amount;
      } else {
        expenseTxn += t.amount;
      }
    } else if (t.source === "schedule" && t.kind === "income") {
      // Schedule payments for studentIncome total
      if (t.method === "kplus") {
        scheduleKplus += t.amount;
        kplus += t.amount; // Also add to combined method breakdown
      } else if (t.method === "cash") {
        scheduleCash += t.amount;
        cash += t.amount; // Also add to combined method breakdown
      } else if (t.method === "truemoney") {
        scheduleTruemoney += t.amount;
        truemoney += t.amount; // Also add to combined method breakdown
      }
    }
  });

  const studentTotal = scheduleKplus + scheduleCash + scheduleTruemoney;
  const balance = incomeTxn + studentTotal - expenseTxn;
  return {
    balance,
    incomeTxn,
    expenseTxn,
    studentIncome: { kplus, cash, truemoney, total: studentTotal },
  };
}

export function summarizeByCategory(data: DataBundle, month: string) {
  // month format YYYY-MM
  const counts: Record<string, number> = {};
  
  data.transactions.forEach((t) => {
    if (!t.createdAt.startsWith(month)) return;
    
    if (t.source === "schedule") {
      // All schedule transactions grouped into one category
      counts["การเก็บเงินจากกำหนดการ"] = (counts["การเก็บเงินจากกำหนดการ"] || 0) + t.amount;
    } else if (t.source === "transaction") {
      // Normal transactions split by their category (or kind if no category)
      const categoryName = t.category || (t.kind === "income" ? "รายรับทั่วไป" : "รายจ่ายทั่วไป");
      counts[categoryName] = (counts[categoryName] || 0) + t.amount;
    }
  });
  
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function filterTransactions(
  txns: Transaction[],
  opts: {
    source?: "transaction" | "schedule";
    kind?: "income" | "expense";
    method?: "kplus" | "cash" | "truemoney";
    search?: string;
  }
) {
  return txns.filter((t) => {
    if (opts.source && t.source !== opts.source) return false;
    if (opts.kind && t.kind !== opts.kind) return false;
    if (opts.method && t.method !== opts.method) return false;
    if (opts.search && !t.name.toLowerCase().includes(opts.search.toLowerCase())) return false;
    return true;
  });
}

export function countStudentPaymentStatus(
  data: DataBundle,
  scheduleId: string
): { paid: number; unpaid: number } {
  const schedule = data.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return { paid: 0, unpaid: 0 };
  // Aggregate amounts per student and treat as paid only if total >= amountPerItem
  const perStudentTotals: Record<string, number> = {};
  for (const t of data.transactions) {
    if (t.source === "schedule" && t.scheduleId === scheduleId && t.studentId) {
      perStudentTotals[t.studentId] = (perStudentTotals[t.studentId] || 0) + t.amount;
    }
  }
  let paid = 0;
  for (const studentId of schedule.studentIds) {
    if ((perStudentTotals[studentId] || 0) >= schedule.amountPerItem) paid++;
  }
  const unpaid = schedule.studentIds.length - paid;
  return { paid, unpaid };
}
