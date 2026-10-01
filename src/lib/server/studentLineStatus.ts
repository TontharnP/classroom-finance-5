import "server-only";

import { listRecords, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest, mapSchedule, mapStudent, mapTransaction } from "@/lib/supabase/mappers";
import { additionalCostKey, getAdditionalCostTotals } from "@/lib/server/additionalCosts";

export async function getStudentLineStatus(lineUserId: string) {
  const [studentRows, scheduleRows, transactionRows, requestRows, additionalCosts] = await Promise.all([
    listRecords<Row>("students"),
    listRecords<Row>("schedules"),
    listRecords<Row>("transactions"),
    listRecords<Row>("line_payment_requests"),
    getAdditionalCostTotals(),
  ]);
  const student = studentRows.map(mapStudent).find((item) => item.line_user_id === lineUserId);
  if (!student) return null;

  const transactions = transactionRows.map(mapTransaction);
  const schedules = scheduleRows.map(mapSchedule).filter((schedule) => schedule.student_ids.includes(student.id));
  const debts = schedules
    .map((schedule) => {
      const paid = transactions
        .filter((transaction) => transaction.source === "schedule" && transaction.schedule_id === schedule.id && transaction.student_id === student.id)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const target = schedule.amount_per_item + (additionalCosts.get(additionalCostKey(schedule.id, student.id)) || 0);
      return { schedule, remaining: Math.max(0, Math.round((target - paid) * 100) / 100) };
    })
    .filter((item) => item.remaining > 0)
    .sort((a, b) => String(a.schedule.end_date || a.schedule.start_date).localeCompare(String(b.schedule.end_date || b.schedule.start_date)));
  const pendingReviews = requestRows
    .map(mapLinePaymentRequest)
    .filter((request) => request.line_user_id === lineUserId && ["pending_slip_review", "pending_review", "cash_pending"].includes(request.status));

  return {
    student,
    debts,
    totalDebt: debts.reduce((sum, item) => sum + item.remaining, 0),
    pendingReviews,
  };
}

export async function getStudentLineHistory(lineUserId: string) {
  const [studentRows, scheduleRows, transactionRows] = await Promise.all([
    listRecords<Row>("students"),
    listRecords<Row>("schedules"),
    listRecords<Row>("transactions"),
  ]);
  const student = studentRows.map(mapStudent).find((item) => item.line_user_id === lineUserId);
  if (!student) return null;

  const scheduleById = new Map(scheduleRows.map((row) => {
    const schedule = mapSchedule(row);
    return [schedule.id, schedule];
  }));
  const transactions = transactionRows
    .map(mapTransaction)
    .filter((transaction) => transaction.source === "schedule" && transaction.kind === "income" && transaction.student_id === student.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return { student, transactions, scheduleById };
}
