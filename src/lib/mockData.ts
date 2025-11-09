import { DataBundle, Schedule, Student, Transaction } from "@/types";

// Stable IDs for consistent SSR/client hydration
const STUDENT_IDS = Array.from({ length: 30 }, (_, i) => `student-${i + 1}`);
const SCHEDULE_IDS = ["schedule-1", "schedule-2"];

// Produce mock data (30 students, a couple schedules, and transactions) for UI scaffolding.
export function mockData(): DataBundle {
  const students: Student[] = Array.from({ length: 30 }).map((_, i) => ({
    id: STUDENT_IDS[i],
    number: i + 1,
    prefix: "นาย",
    firstName: `Student${i + 1}`,
    lastName: "Demo",
    nickName: `S${i + 1}`,
  }));

  const schedules: Schedule[] = [
    {
      id: SCHEDULE_IDS[0],
      name: "เงินค่าหนังสือรุ่น",
      startDate: "2025-11-08",
      endDate: "2025-11-22", // 14 days from now
      details: "เก็บเงินทำหนังสือรุ่น",
      amountPerItem: 200,
      studentIds: students.map((s) => s.id),
    },
    {
      id: SCHEDULE_IDS[1],
      name: "เงินทัศนศึกษา",
      startDate: "2025-11-08",
      endDate: "2025-12-08", // 30 days from now
      details: "ค่าเดินทาง",
      amountPerItem: 500,
      studentIds: students.slice(0, 20).map((s) => s.id),
    },
  ];

  // Generate some stable transactions
  const transactions: Transaction[] = [];
  const baseDate = new Date("2025-11-08T10:00:00Z").getTime();

  // Normal income/expense transactions
  const categories = ["อุปกรณ์", "เดินทาง", "กิจกรรม", "อื่นๆ"];
  for (let i = 0; i < 10; i++) {
    const kind = i % 5 !== 0 ? "income" : "expense"; // Predictable pattern
    transactions.push({
      id: `txn-${i + 1}`,
      name: kind === "income" ? `Income ${i + 1}` : `Expense ${i + 1}`,
      source: "transaction",
      kind,
      amount: kind === "income" ? 100 + i * 20 : 80 + i * 15,
      method: "kplus",
      category: categories[i % categories.length],
      createdAt: new Date(baseDate - i * 1000 * 60 * 60 * 24).toISOString(),
    });
  }

  // Schedule payments (simulate some students paid)
  let txnCounter = 100;
  schedules.forEach((schedule, schedIdx) => {
    schedule.studentIds.slice(0, Math.floor(schedule.studentIds.length * 0.5)).forEach((sid, idx) => {
      const methods: any[] = ["kplus", "cash", "truemoney"];
      transactions.push({
        id: `txn-sched-${schedIdx}-${idx}`,
        name: schedule.name,
        source: "schedule",
        kind: "income",
        amount: schedule.amountPerItem,
        method: methods[idx % methods.length],
        scheduleId: schedule.id,
        studentId: sid,
        createdAt: new Date(baseDate - idx * 3600 * 1000).toISOString(),
      });
      txnCounter++;
    });
  });

  return { students, schedules, transactions, categories: [] };
}
