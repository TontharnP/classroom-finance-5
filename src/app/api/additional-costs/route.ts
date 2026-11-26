import { ok, serverError } from "@/lib/api/response";
import { mutateAdditionalCostRound } from "@/lib/server/additionalCosts";
import { isMissingTableError, listRecords, type Row } from "@/lib/supabase/server";
import { mapAdditionalCostItem, mapAdditionalCostRun } from "@/lib/supabase/mappers";

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
  const body = await request.json().catch(() => null);
  return mutateAdditionalCostRound("create", body?.requestKey, body?.percentage);
}
