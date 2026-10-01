import { notFound, ok, serverError } from "@/lib/api/response";
import { getRecord, listRecords, toNumber, type Row } from "@/lib/supabase/server";
import { additionalCostKey, getAdditionalCostTotals } from "@/lib/server/additionalCosts";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const schedule = await getRecord<Row>("schedules", id);
    if (!schedule) return notFound("Schedule not found");

    const [transactions, additionalCosts] = await Promise.all([
      listRecords<Row>("transactions"),
      getAdditionalCostTotals(),
    ]);
    const studentIds = Array.isArray(schedule.student_ids) ? schedule.student_ids.map(String) : [];
    const amountPerItem = toNumber(schedule.amount_per_item);
    const paidByStudent = new Map<string, number>();
    for (const transaction of transactions) {
      if (
        transaction.schedule_id !== id ||
        transaction.source !== "schedule" ||
        transaction.kind !== "income" ||
        !transaction.student_id ||
        !studentIds.includes(String(transaction.student_id))
      ) continue;
      const studentId = String(transaction.student_id);
      paidByStudent.set(studentId, (paidByStudent.get(studentId) || 0) + toNumber(transaction.amount));
    }
    const targets = studentIds.map(
      (studentId) => amountPerItem + (additionalCosts.get(additionalCostKey(id, studentId)) || 0)
    );
    const paidStudents = studentIds.filter(
      (studentId, index) => (paidByStudent.get(studentId) || 0) >= targets[index]
    ).length;
    const totalCollected = Array.from(paidByStudent.values()).reduce((sum, amount) => sum + amount, 0);
    const targetAmount = targets.reduce((sum, amount) => sum + amount, 0);

    return ok({
      totalStudents: studentIds.length,
      paidStudents,
      unpaidStudents: studentIds.length - paidStudents,
      totalCollected,
      targetAmount,
    });
  } catch (error) {
    return serverError(error);
  }
}
