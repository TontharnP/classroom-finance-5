import { badRequest, ok, serverError } from "@/lib/api/response";
import {
  createRecord,
  emptyToNull,
  ensureScheduleFolderSchema,
  listRecords,
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
    const rows = (await listRecords<Row>("schedules"))
      .filter((schedule) => !active || !schedule.end_date || String(schedule.end_date) >= today)
      .sort(compareSchedules);
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
  const schedules = await listRecords<Row>("schedules");
  return (
    Math.max(
      -1,
      ...schedules
        .filter((schedule) => schedule.folder_id === folderId)
        .map((schedule) => Number(schedule.sort_order ?? 0))
    ) + 1
  );
}

function compareSchedules(a: Row, b: Row) {
  const folderComparison = String(a.folder_id ?? "").localeCompare(String(b.folder_id ?? ""));
  if (folderComparison !== 0) return folderComparison;

  const sortComparison = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  if (sortComparison !== 0) return sortComparison;

  return String(b.start_date ?? "").localeCompare(String(a.start_date ?? ""));
}
