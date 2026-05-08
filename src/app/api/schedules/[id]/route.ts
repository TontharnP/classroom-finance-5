import { noContent, notFound, ok, serverError } from "@/lib/api/response";
import {
  deleteRecord,
  ensureScheduleFolderSchema,
  getRecord,
  updateRecord,
  type Row,
} from "@/lib/supabase/server";
import { mapSchedule } from "@/lib/supabase/mappers";
import type { ScheduleUpdate } from "@/types/supabase";

type RouteContext = { params: Promise<{ id: string }> };

const scheduleColumns = ["name", "amount_per_item", "start_date", "end_date", "description", "student_ids", "folder_id", "sort_order"];

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureScheduleFolderSchema();
    const { id } = await context.params;
    const row = await getRecord<Row>("schedules", id);
    if (!row) return notFound("Schedule not found");
    return ok(mapSchedule(row));
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureScheduleFolderSchema();
    const { id } = await context.params;
    const body = (await request.json()) as ScheduleUpdate;
    const row = await updateRecord<Row>("schedules", id, body, scheduleColumns);
    if (!row) return notFound("Schedule not found");
    return ok(mapSchedule(row));
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await ensureScheduleFolderSchema();
    const { id } = await context.params;
    const deleted = await deleteRecord("schedules", id);
    if (!deleted) return notFound("Schedule not found");
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
