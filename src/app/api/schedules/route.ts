import { badRequest, ok, serverError } from "@/lib/api/response";
import {
  createRecord,
  emptyToNull,
  ensureScheduleFolderSchema,
  getSupabaseAdmin,
  type Row,
} from "@/lib/supabase/server";
import { mapSchedule } from "@/lib/supabase/mappers";
import type { ScheduleInput } from "@/types/supabase";

export async function GET(request: Request) {
  try {
    await ensureScheduleFolderSchema();
    const url = new URL(request.url);
    const active = url.searchParams.get("active") === "true";
    const today = new Date().toISOString().split("T")[0];
    let query = getSupabaseAdmin().from("schedules").select("*");
    if (active) query = query.or(`end_date.is.null,end_date.gte.${today}`);
    const { data, error } = await query
      .order("folder_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("start_date", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    return ok(rows.map(mapSchedule));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureScheduleFolderSchema();
    const body = (await request.json()) as ScheduleInput;
    if (!body.folder_id) return badRequest("Schedule folder is required");
    const sortOrder = body.sort_order ?? (await nextScheduleSortOrder(body.folder_id));
    const row = await createRecord<Row>("schedules", {
      name: body.name,
      amount_per_item: body.amount_per_item,
      start_date: body.start_date,
      end_date: emptyToNull(body.end_date),
      description: emptyToNull(body.description),
      student_ids: body.student_ids,
      folder_id: body.folder_id,
      sort_order: sortOrder,
    });
    return ok(mapSchedule(row), 201);
  } catch (error) {
    return serverError(error);
  }
}

async function nextScheduleSortOrder(folderId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("schedules")
    .select("sort_order")
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.sort_order ?? -1) + 1;
}
