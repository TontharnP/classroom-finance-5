import { notFound, ok, serverError } from "@/lib/api/response";
import { getRecord, listRecords, toNumber, type Row } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const schedule = await getRecord<Row>("schedules", id);
    if (!schedule) return notFound("Schedule not found");

    const paidStudentIds = new Set(
      (await listRecords<Row>("transactions"))
        .filter(
          (transaction) =>
            transaction.schedule_id === id &&
            transaction.source === "schedule" &&
            transaction.student_id
        )
        .map((transaction) => String(transaction.student_id))
    );

    const totalStudents = Array.isArray(schedule.student_ids) ? schedule.student_ids.length : 0;
    const paidStudents = paidStudentIds.size;
    const amountPerItem = toNumber(schedule.amount_per_item);

    return ok({
      totalStudents,
      paidStudents,
      unpaidStudents: totalStudents - paidStudents,
      totalCollected: paidStudents * amountPerItem,
      targetAmount: totalStudents * amountPerItem,
    });
  } catch (error) {
    return serverError(error);
  }
}
