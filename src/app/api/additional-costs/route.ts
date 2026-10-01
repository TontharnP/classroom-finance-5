import { badRequest, ok, serverError } from "@/lib/api/response";
import { buildAdditionalCostCandidates, roundMoney } from "@/lib/server/additionalCosts";
import {
  createRecord,
  deleteRecord,
  getSupabaseAdmin,
  isMissingTableError,
  listRecords,
  type Row,
} from "@/lib/supabase/server";
import { mapAdditionalCostItem, mapAdditionalCostRun } from "@/lib/supabase/mappers";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const [runRows, itemRows] = await Promise.all([
      listRecords<Row>("additional_cost_runs"),
      listRecords<Row>("additional_cost_items"),
    ]);
    return ok({
      runs: runRows
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map(mapAdditionalCostRun),
      items: itemRows
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map(mapAdditionalCostItem),
    });
  } catch (error) {
    // Keep the rest of the app usable while the additive migration is being deployed.
    if (
      isMissingTableError(error, "additional_cost_runs") ||
      isMissingTableError(error, "additional_cost_items")
    ) {
      return ok({ runs: [], items: [] });
    }
    return serverError(error);
  }
}

export async function POST(request: Request) {
  let createdRunId: string | null = null;
  try {
    const body = (await request.json()) as { percentage?: unknown; requestKey?: unknown };
    const percentage = Number(body.percentage);
    const requestKey = typeof body.requestKey === "string" ? body.requestKey : "";

    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      return badRequest("Percentage must be greater than 0 and no more than 100");
    }
    if (!UUID_PATTERN.test(requestKey)) return badRequest("A valid request key is required");

    const { data: existingRunData, error: existingRunError } = await getSupabaseAdmin()
      .from("additional_cost_runs")
      .select("*")
      .eq("request_key", requestKey)
      .maybeSingle();
    if (existingRunError) throw existingRunError;
    const existingRun = existingRunData as Row | null;
    if (existingRun) {
      const { data: itemData, error: itemError } = await getSupabaseAdmin()
        .from("additional_cost_items")
        .select("*")
        .eq("run_id", String(existingRun.id));
      if (itemError) throw itemError;
      const existingItems = ((itemData ?? []) as Row[]).map(mapAdditionalCostItem);
      return ok({ run: mapAdditionalCostRun(existingRun), items: existingItems });
    }

    const candidates = await buildAdditionalCostCandidates(percentage);
    if (candidates.length === 0) return badRequest("No unpaid overdue schedules were found");

    const baseTotal = roundMoney(candidates.reduce((sum, item) => sum + item.baseOutstanding, 0));
    const additionalTotal = roundMoney(candidates.reduce((sum, item) => sum + item.amount, 0));
    const runRow = await createRecord<Row>("additional_cost_runs", {
      request_key: requestKey,
      percentage,
      affected_student_count: new Set(candidates.map((item) => item.studentId)).size,
      overdue_item_count: candidates.length,
      base_total: baseTotal,
      additional_total: additionalTotal,
    });
    createdRunId = String(runRow.id);

    const { data, error } = await getSupabaseAdmin()
      .from("additional_cost_items")
      .insert(
        candidates.map((item) => ({
          run_id: createdRunId,
          schedule_id: item.scheduleId,
          student_id: item.studentId,
          base_outstanding: item.baseOutstanding,
          percentage: item.percentage,
          amount: item.amount,
        }))
      )
      .select("*");
    if (error) throw error;

    return ok(
      {
        run: mapAdditionalCostRun(runRow),
        items: (data ?? []).map((row) => mapAdditionalCostItem(row as Row)),
      },
      201
    );
  } catch (error) {
    if (createdRunId) {
      await deleteRecord("additional_cost_runs", createdRunId).catch(() => undefined);
    }
    return serverError(error);
  }
}
