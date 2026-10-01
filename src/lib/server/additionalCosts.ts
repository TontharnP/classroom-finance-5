import "server-only";

import { isMissingTableError, listRecords, toNumber, type Row } from "@/lib/supabase/server";

export type AdditionalCostCandidate = {
  scheduleId: string;
  studentId: string;
  baseOutstanding: number;
  percentage: number;
  amount: number;
};

export function additionalCostKey(scheduleId: string, studentId: string) {
  return `${scheduleId}:${studentId}`;
}

export async function listAdditionalCostItemsSafely(): Promise<Row[]> {
  try {
    return await listRecords<Row>("additional_cost_items");
  } catch (error) {
    if (isMissingTableError(error, "additional_cost_items")) return [];
    throw error;
  }
}

export async function getAdditionalCostTotals() {
  const totals = new Map<string, number>();
  for (const item of await listAdditionalCostItemsSafely()) {
    const scheduleId = String(item.schedule_id);
    const studentId = String(item.student_id);
    const key = additionalCostKey(scheduleId, studentId);
    totals.set(key, roundMoney((totals.get(key) || 0) + toNumber(item.amount)));
  }
  return totals;
}

export async function buildAdditionalCostCandidates(percentage: number) {
  const [schedules, transactions, existingItems] = await Promise.all([
    listRecords<Row>("schedules"),
    listRecords<Row>("transactions"),
    listAdditionalCostItemsSafely(),
  ]);

  const paid = new Map<string, number>();
  for (const transaction of transactions) {
    if (
      transaction.source !== "schedule" ||
      transaction.kind !== "income" ||
      !transaction.schedule_id ||
      !transaction.student_id
    ) continue;
    const key = additionalCostKey(String(transaction.schedule_id), String(transaction.student_id));
    paid.set(key, roundMoney((paid.get(key) || 0) + toNumber(transaction.amount)));
  }

  const existingCosts = new Map<string, number>();
  for (const item of existingItems) {
    const key = additionalCostKey(String(item.schedule_id), String(item.student_id));
    existingCosts.set(key, roundMoney((existingCosts.get(key) || 0) + toNumber(item.amount)));
  }

  const today = bangkokDateKey();
  const candidates: AdditionalCostCandidate[] = [];
  for (const schedule of schedules) {
    const dueDate = schedule.end_date ? String(schedule.end_date).slice(0, 10) : "";
    if (!dueDate || dueDate >= today || !Array.isArray(schedule.student_ids)) continue;

    const scheduleId = String(schedule.id);
    for (const rawStudentId of schedule.student_ids) {
      const studentId = String(rawStudentId);
      const key = additionalCostKey(scheduleId, studentId);
      const target = roundMoney(toNumber(schedule.amount_per_item) + (existingCosts.get(key) || 0));
      const baseOutstanding = Math.max(0, roundMoney(target - (paid.get(key) || 0)));
      if (baseOutstanding <= 0) continue;

      // The requested percentage is calculated and rounded per overdue item.
      const amount = roundMoney(baseOutstanding * (percentage / 100));
      if (amount <= 0) continue;
      candidates.push({ scheduleId, studentId, baseOutstanding, percentage, amount });
    }
  }

  return candidates;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function bangkokDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
