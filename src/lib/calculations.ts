import { DataBundle, Transaction } from "@/types";

interface BalanceSummary {
  balance: number;
  incomeTxn: number;
  expenseTxn: number;
  studentIncome: { kplus: number; cash: number; truemoney: number; total: number };
  methodBreakdown: { kplus: number; cash: number; truemoney: number };
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
    // Skip transfers for global balance
    if (t.kind === "transfer") return;

    if (t.source === "transaction") {
      if (t.kind === "income") {
        incomeTxn += t.amount;
        // Include normal transaction income in method breakdown
        if (t.method === "kplus") kplus += t.amount;
        else if (t.method === "cash") cash += t.amount;
        else if (t.method === "truemoney") truemoney += t.amount;
      } else if (t.kind === "expense") {
        expenseTxn += t.amount;
        // Subtract expense from method totals
        if (t.method === "kplus") kplus -= t.amount;
        else if (t.method === "cash") cash -= t.amount;
        else if (t.method === "truemoney") truemoney -= t.amount;
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
    studentIncome: {
      kplus: scheduleKplus,
      cash: scheduleCash,
      truemoney: scheduleTruemoney,
      total: studentTotal
    },
    methodBreakdown: {
      kplus,
      cash,
      truemoney
    },
  };
}

export function calculatePocketBalance(data: DataBundle, pocketId: string): number {
  let balance = 0;

  // Identify if this pocket corresponds to a specific payment method
  const pocket = data.pockets.find(p => p.id === pocketId);
  const methodMap: Record<string, string> = {
    "pocket-kplus": "kplus",
    "pocket-cash": "cash",
    "pocket-truemoney": "truemoney"
  };
  const targetMethod = methodMap[pocketId];

  data.transactions.forEach((t) => {
    let amount = 0;
    let isRelevant = false;

    // 1. Direct linkage via pocketId
    if (t.pocketId === pocketId) {
      isRelevant = true;
      amount = t.kind === "expense" || (t.kind === "transfer" && t.sourcePocketId === pocketId) ? -t.amount : t.amount;
    }
    // 2. Fallback: linkage via payment method (if not already counted by pocketId)
    else if (targetMethod && t.method === targetMethod && !t.pocketId) {
      // creating a mock pocket linkage for old transactions
      // Only for income/expense. Transfers must be explicit.
      if (t.kind === "income") {
        isRelevant = true;
        amount = t.amount;
      } else if (t.kind === "expense") {
        isRelevant = true;
        amount = -t.amount;
      }
    }

    // 3. Handle transfers where this pocket is source or dest (and might not have set pocketId on the main txn record if explicit logic usually does)
    // Actually, transfers should have explicit source/dest.
    if (t.kind === "transfer") {
      if (t.sourcePocketId === pocketId) {
        balance -= t.amount;
      } else if (t.destinationPocketId === pocketId) {
        balance += t.amount;
      }
      return; // Already handled transfer logic
    }

    if (isRelevant) {
      balance += amount;
    }
  });

  return balance;
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

export function summarizeByMethodAndExpense(data: DataBundle, month: string) {
  let kplus = 0;
  let cash = 0;
  let truemoney = 0;
  let expenses = 0;

  data.transactions.forEach((t) => {
    if (!t.createdAt.startsWith(month)) return;
    // Skip internal transfers for this graph
    if (t.kind === "transfer") return;

    if (t.kind === "expense") {
      expenses += t.amount;
    } else if (t.kind === "income") {
      if (t.method === "kplus") kplus += t.amount;
      else if (t.method === "cash") cash += t.amount;
      else if (t.method === "truemoney") truemoney += t.amount;
    }
  });

  return [
    { name: "K PLUS", value: kplus },
    { name: "เงินสด", value: cash },
    { name: "TrueMoney", value: truemoney },
    { name: "รายจ่าย", value: expenses }
  ].filter(i => i.value > 0);
}

export function filterTransactions(
  txns: Transaction[],
  opts: {
    source?: "transaction" | "schedule";
    kind?: "income" | "expense" | "transfer";
    method?: "kplus" | "cash" | "truemoney";
    search?: string;
    students?: import("@/types").Student[]; // Optional for name resolution
  }
) {
  return txns.filter((t) => {
    if (opts.source && t.source !== opts.source) return false;
    if (opts.kind && t.kind !== opts.kind) return false;
    if (opts.method && t.method !== opts.method) return false;

    if (opts.search) {
      const q = opts.search.toLowerCase();
      // Check basic fields
      const basicMatch =
        t.name.toLowerCase().includes(q) ||
        t.amount.toString().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.method && t.method.toLowerCase().includes(q));

      if (basicMatch) return true;

      // Check date
      if (t.createdAt.includes(opts.search)) return true; // Simple YYYY-MM-DD check

      // Check Payer Name (if from schedule and students list provided)
      if (t.source === "schedule" && t.studentId && opts.students) {
        const student = opts.students.find(s => s.id === t.studentId);
        if (student) {
          const fullName = `${student.firstName} ${student.lastName} ${student.nickName}`.toLowerCase();
          if (fullName.includes(q)) return true;
        }
      }

      return false;
    }
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
