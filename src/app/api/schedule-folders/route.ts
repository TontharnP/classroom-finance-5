import { badRequest, ok, serverError } from "@/lib/api/response";
import {
  createRecord,
  DEFAULT_SCHEDULE_FOLDER,
  emptyToNull,
  ensureScheduleFolderSchema,
  isMissingTableError,
  listRecords,
  type Row,
} from "@/lib/supabase/server";
import { mapScheduleFolder } from "@/lib/supabase/mappers";
import type { ScheduleFolderInput } from "@/types/supabase";

export async function GET() {
  try {
    await ensureScheduleFolderSchema();
    let rows: Row[];
    try {
      rows = (await listRecords<Row>("schedule_folders")).sort(compareFolders);
    } catch (error) {
      if (!isMissingTableError(error, "schedule_folders")) throw error;
      rows = [DEFAULT_SCHEDULE_FOLDER];
    }
    return ok(rows.map(mapScheduleFolder));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureScheduleFolderSchema();
    const body = (await request.json()) as Partial<ScheduleFolderInput>;
    if (!body.name?.trim()) return badRequest("Folder name is required");

    const parentId = emptyToNull(body.parent_id);
    const sortOrder = body.sort_order ?? (await nextSortOrder(parentId));
    const row = await createRecord<Row>("schedule_folders", {
      name: body.name.trim(),
      parent_id: parentId,
      sort_order: sortOrder,
      is_hidden: body.is_hidden ?? false,
    });
    return ok(mapScheduleFolder(row), 201);
  } catch (error) {
    return serverError(error);
  }
}

async function nextSortOrder(parentId: string | null) {
  const folders = await listRecords<Row>("schedule_folders");
  return (
    Math.max(
      -1,
      ...folders
        .filter((folder) =>
          parentId ? folder.parent_id === parentId : !folder.parent_id
        )
        .map((folder) => Number(folder.sort_order ?? 0))
    ) + 1
  );
}

function compareFolders(a: Row, b: Row) {
  const aParent = a.parent_id ? String(a.parent_id) : "";
  const bParent = b.parent_id ? String(b.parent_id) : "";
  const parentComparison = aParent.localeCompare(bParent);
  if (parentComparison !== 0) return parentComparison;

  const sortComparison = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  if (sortComparison !== 0) return sortComparison;

  return String(a.name ?? "").localeCompare(String(b.name ?? ""));
}
