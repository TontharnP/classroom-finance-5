import { ok, serverError } from "@/lib/api/response";
import { BOOTSTRAP_RESOURCES, type BootstrapResource } from "@/lib/bootstrap";
import { attachSlipDataToTransactions } from "@/lib/server/transactionSlips";
import {
  DEFAULT_SCHEDULE_FOLDER,
  ensureScheduleFolderSchema,
  getSupabaseAdmin,
  isMissingTableError,
  type Row,
} from "@/lib/supabase/server";
import {
  mapAdditionalCostItem,
  mapAdditionalCostRun,
  mapCategory,
  mapSchedule,
  mapScheduleFolder,
  mapStudent,
  mapTransaction,
} from "@/lib/supabase/mappers";

const STUDENT_COLUMNS = "id,prefix,first_name,last_name,nick_name,number,avatar_url,line_user_id,created_at,updated_at";
const SCHEDULE_COLUMNS = "id,name,amount_per_item,start_date,end_date,description,student_ids,folder_id,sort_order,created_at,updated_at";
const FOLDER_COLUMNS = "id,name,parent_id,sort_order,is_hidden,created_at,updated_at";
const TRANSACTION_COLUMNS = "id,name,kind,amount,method,category,category_id,description,source,schedule_id,student_id,created_at,updated_at,pocket_id,source_pocket_id,destination_pocket_id";
const CATEGORY_COLUMNS = "id,name,icon,created_at,updated_at";
const COST_RUN_COLUMNS = "id,request_key,percentage,affected_student_count,overdue_item_count,base_total,additional_total,created_at";
const COST_ITEM_COLUMNS = "id,run_id,schedule_id,student_id,base_outstanding,percentage,amount,created_at";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const resources = parseResources(new URL(request.url).searchParams.get("resources"));
    const requested = new Set<BootstrapResource>(resources);
    const wants = (resource: BootstrapResource) => requested.has(resource);

    if (wants("schedules") || wants("scheduleFolders")) {
      await ensureScheduleFolderSchema();
    }
    const supabase = getSupabaseAdmin();

    const [studentsResult, schedulesResult, foldersResult, transactionsResult, categoriesResult, costRunsResult, costItemsResult] =
      await Promise.all([
        wants("students")
          ? supabase.from("students").select(STUDENT_COLUMNS).order("number", { ascending: true })
          : null,
        wants("schedules")
          ? supabase
              .from("schedules")
              .select(SCHEDULE_COLUMNS)
              .order("folder_id", { ascending: true })
              .order("sort_order", { ascending: true })
              .order("start_date", { ascending: false })
          : null,
        wants("scheduleFolders")
          ? supabase
              .from("schedule_folders")
              .select(FOLDER_COLUMNS)
              .order("parent_id", { ascending: true, nullsFirst: true })
              .order("sort_order", { ascending: true })
              .order("name", { ascending: true })
          : null,
        wants("transactions")
          ? supabase.from("transactions").select(TRANSACTION_COLUMNS).order("created_at", { ascending: false })
          : null,
        wants("categories")
          ? supabase.from("categories").select(CATEGORY_COLUMNS).order("name", { ascending: true })
          : null,
        wants("additionalCosts")
          ? supabase.from("additional_cost_runs").select(COST_RUN_COLUMNS).order("created_at", { ascending: false })
          : null,
        wants("additionalCosts")
          ? supabase.from("additional_cost_items").select(COST_ITEM_COLUMNS).order("created_at", { ascending: false })
          : null,
      ]);

    if (studentsResult?.error) throw studentsResult.error;
    if (schedulesResult?.error) throw schedulesResult.error;
    if (transactionsResult?.error) throw transactionsResult.error;
    if (categoriesResult?.error) throw categoriesResult.error;

    let folderRows = (foldersResult?.data ?? []) as Row[];
    if (foldersResult?.error) {
      if (!isMissingTableError(foldersResult.error, "schedule_folders")) throw foldersResult.error;
      folderRows = [DEFAULT_SCHEDULE_FOLDER];
    }

    const missingCostRuns = Boolean(
      costRunsResult?.error && isMissingTableError(costRunsResult.error, "additional_cost_runs")
    );
    const missingCostItems = Boolean(
      costItemsResult?.error && isMissingTableError(costItemsResult.error, "additional_cost_items")
    );
    if (costRunsResult?.error && !missingCostRuns) throw costRunsResult.error;
    if (costItemsResult?.error && !missingCostItems) throw costItemsResult.error;
    const missingCostTables = missingCostRuns || missingCostItems;

    const transactionRows = transactionsResult
      ? await attachSlipDataToTransactions((transactionsResult.data ?? []) as Row[])
      : [];

    return ok({
      resources,
      ...(studentsResult
        ? { students: ((studentsResult.data ?? []) as Row[]).map(mapStudent) }
        : {}),
      ...(schedulesResult
        ? { schedules: ((schedulesResult.data ?? []) as Row[]).map(mapSchedule) }
        : {}),
      ...(foldersResult ? { scheduleFolders: folderRows.map(mapScheduleFolder) } : {}),
      ...(transactionsResult ? { transactions: transactionRows.map(mapTransaction) } : {}),
      ...(categoriesResult
        ? { categories: ((categoriesResult.data ?? []) as Row[]).map(mapCategory) }
        : {}),
      ...(costRunsResult || costItemsResult
        ? {
            additionalCostRuns: missingCostTables
              ? []
              : (((costRunsResult?.data ?? []) as Row[]).map(mapAdditionalCostRun)),
            additionalCostItems: missingCostTables
              ? []
              : (((costItemsResult?.data ?? []) as Row[]).map(mapAdditionalCostItem)),
          }
        : {}),
    });
  } catch (error) {
    return serverError(error);
  }
}

function parseResources(value: string | null): BootstrapResource[] {
  if (!value) return [...BOOTSTRAP_RESOURCES];
  const allowed = new Set<string>(BOOTSTRAP_RESOURCES);
  const resources = value
    .split(",")
    .filter((resource): resource is BootstrapResource => allowed.has(resource));
  return resources.length > 0 ? Array.from(new Set(resources)) : [...BOOTSTRAP_RESOURCES];
}
