import "server-only";

import { getSupabaseAdmin, isMissingTableError, toNumber, type Row } from "@/lib/supabase/server";

import { badRequest, noContent, notFound, ok, serverError } from "@/lib/api/response";
import { mapAdditionalCostItem, mapAdditionalCostRun } from "@/lib/supabase/mappers";
import { roundMoney } from "@/lib/additionalCosts";

export function additionalCostKey(scheduleId: string, studentId: string) {
  return `${scheduleId}:${studentId}`;
}

export async function listAdditionalCostItemsSafely(filters: { scheduleId?: string; studentId?: string } = {}): Promise<Row[]> {
  try {
    let query = getSupabaseAdmin()
      .from("additional_cost_items")
      .select("schedule_id,student_id,amount");
    if (filters.scheduleId) query = query.eq("schedule_id", filters.scheduleId);
    if (filters.studentId) query = query.eq("student_id", filters.studentId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Row[];
  } catch (error) {
    if (isMissingTableError(error, "additional_cost_items")) return [];
    throw error;
  }
}

export async function getAdditionalCostTotals(filters: { scheduleId?: string; studentId?: string } = {}) {
  const totals = new Map<string, number>();
  for (const item of await listAdditionalCostItemsSafely(filters)) {
    const scheduleId = String(item.schedule_id);
    const studentId = String(item.student_id);
    const key = additionalCostKey(scheduleId, studentId);
    totals.set(key, roundMoney((totals.get(key) || 0) + toNumber(item.amount)));
  }
  return totals;
}

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function mutateAdditionalCostRound(action: "create" | "update" | "delete", id: unknown, percentage?: unknown) {
  if (typeof id !== "string" || !uuidPattern.test(id)) return badRequest("รหัสรอบค่าใช้จ่ายไม่ถูกต้อง");
  if (action !== "delete" && (
    typeof percentage !== "number" || !Number.isFinite(percentage) || percentage <= 0 || percentage > 100
  )) return badRequest("กรุณาระบุเปอร์เซ็นต์มากกว่า 0 และไม่เกิน 100");

  try {
    const { data, error } = await getSupabaseAdmin().rpc("mutate_additional_cost_round", {
      p_action: action,
      p_id: id,
      p_percentage: action === "delete" ? null : percentage,
    });
    if (error?.code === "22023") return badRequest(error.message);
    if (error?.code === "P0002") return notFound(error.message);
    if (error) throw error;
    if (action === "delete") return noContent();
    return ok({ run: mapAdditionalCostRun(data.run), items: (data.items as Row[]).map(mapAdditionalCostItem) }, action === "create" ? 201 : 200);
  } catch (error) {
    return serverError(error);
  }
}
