import "server-only";

import { getSupabaseAdmin, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest, mapSchedule, mapStudent, mapTransaction } from "@/lib/supabase/mappers";
import { additionalCostKey, getAdditionalCostTotals } from "@/lib/server/additionalCosts";

export async function getStudentLineStatus(lineUserId: string) {
  const { data: studentRow, error: studentError } = await getSupabaseAdmin()
    .from("students")
    .select("*")
    .eq("line_user_id", lineUserId)
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (studentError) throw studentError;
  if (!studentRow) return null;
  const student = mapStudent(studentRow as Row);

  const [scheduleResult, transactionResult, requestResult, additionalCosts] = await Promise.all([
    getSupabaseAdmin().from("schedules").select("*").contains("student_ids", [student.id]),
    getSupabaseAdmin()
      .from("transactions")
      .select("schedule_id,student_id,amount,source,kind")
      .eq("student_id", student.id)
      .eq("source", "schedule")
      .eq("kind", "income"),
    getSupabaseAdmin()
      .from("line_payment_requests")
      .select("*")
      .eq("line_user_id", lineUserId)
      .in("status", ["pending_slip_review", "pending_review", "cash_pending"]),
    getAdditionalCostTotals({ studentId: student.id }),
  ]);
  if (scheduleResult.error) throw scheduleResult.error;
  if (transactionResult.error) throw transactionResult.error;
  if (requestResult.error) throw requestResult.error;

  const transactionRows = (transactionResult.data ?? []) as Row[];
  const schedules = ((scheduleResult.data ?? []) as Row[]).map(mapSchedule);
  const debts = schedules
    .map((schedule) => {
      const paid = transactionRows
        .filter((transaction) => transaction.schedule_id === schedule.id)
        .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
      const target = schedule.amount_per_item + (additionalCosts.get(additionalCostKey(schedule.id, student.id)) || 0);
      return { schedule, remaining: Math.max(0, Math.round((target - paid) * 100) / 100) };
    })
    .filter((item) => item.remaining > 0)
    .sort((a, b) => String(a.schedule.end_date || a.schedule.start_date).localeCompare(String(b.schedule.end_date || b.schedule.start_date)));
  const pendingReviews = ((requestResult.data ?? []) as Row[]).map(mapLinePaymentRequest);

  return {
    student,
    debts,
    totalDebt: debts.reduce((sum, item) => sum + item.remaining, 0),
    pendingReviews,
  };
}

export async function getStudentLineHistory(lineUserId: string) {
  const { data: studentRow, error: studentError } = await getSupabaseAdmin()
    .from("students")
    .select("*")
    .eq("line_user_id", lineUserId)
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (studentError) throw studentError;
  if (!studentRow) return null;
  const student = mapStudent(studentRow as Row);

  const { data: transactionRows, error: transactionError } = await getSupabaseAdmin()
    .from("transactions")
    .select("*")
    .eq("student_id", student.id)
    .eq("source", "schedule")
    .eq("kind", "income")
    .order("created_at", { ascending: false });
  if (transactionError) throw transactionError;
  const transactions = ((transactionRows ?? []) as Row[]).map(mapTransaction);
  const scheduleIds = Array.from(new Set(transactions.map((transaction) => transaction.schedule_id).filter(Boolean))) as string[];
  const scheduleResult = scheduleIds.length > 0
    ? await getSupabaseAdmin().from("schedules").select("*").in("id", scheduleIds)
    : { data: [], error: null };
  if (scheduleResult.error) throw scheduleResult.error;

  const scheduleById = new Map(((scheduleResult.data ?? []) as Row[]).map((row) => {
    const schedule = mapSchedule(row);
    return [schedule.id, schedule];
  }));

  return { student, transactions, scheduleById };
}
