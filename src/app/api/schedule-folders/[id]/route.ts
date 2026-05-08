import { badRequest, noContent, notFound, ok, serverError } from "@/lib/api/response";
import {
  deleteRecord,
  ensureScheduleFolderSchema,
  getRecord,
  listRecords,
  updateRecord,
  type Row,
} from "@/lib/supabase/server";
import { mapScheduleFolder } from "@/lib/supabase/mappers";
import type { ScheduleFolderUpdate } from "@/types/supabase";

type RouteContext = { params: Promise<{ id: string }> };

const folderColumns = ["name", "parent_id", "sort_order", "is_hidden"];

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureScheduleFolderSchema();
    const { id } = await context.params;
    const row = await getRecord<Row>("schedule_folders", id);
    if (!row) return notFound("Schedule folder not found");
    return ok(mapScheduleFolder(row));
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureScheduleFolderSchema();
    const { id } = await context.params;
    const body = (await request.json()) as ScheduleFolderUpdate & { parent_id?: string | null };
    const parentId = body.parent_id ?? null;

    if (body.name !== undefined && !body.name.trim()) {
      return badRequest("Folder name is required");
    }
    if (body.parent_id !== undefined) {
      if (parentId === id) return badRequest("Folder cannot be moved into itself");
      if (parentId && await isDescendant(parentId, id)) {
        return badRequest("Folder cannot be moved into its descendant");
      }
    }

    const updates = {
      ...body,
      name: body.name?.trim(),
      parent_id: body.parent_id === undefined ? undefined : parentId,
    };
    const row = await updateRecord<Row>("schedule_folders", id, updates, folderColumns);
    if (!row) return notFound("Schedule folder not found");
    return ok(mapScheduleFolder(row));
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await ensureScheduleFolderSchema();
    const { id } = await context.params;
    const schedules = await listRecords<Row>("schedules");
    const folders = await listRecords<Row>("schedule_folders");
    const hasSchedules = schedules.some((schedule) => schedule.folder_id === id);
    const hasChildren = folders.some((folder) => folder.parent_id === id);
    if (hasSchedules || hasChildren) {
      return badRequest("Cannot delete a folder that contains schedules or child folders");
    }

    const deleted = await deleteRecord("schedule_folders", id);
    if (!deleted) return notFound("Schedule folder not found");
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}

async function isDescendant(candidateId: string, ancestorId: string) {
  const folders = await listRecords<Row>("schedule_folders");
  const childrenByParent = new Map<string, string[]>();

  for (const folder of folders) {
    if (!folder.parent_id) continue;
    const parentId = String(folder.parent_id);
    const children = childrenByParent.get(parentId) ?? [];
    children.push(String(folder.id));
    childrenByParent.set(parentId, children);
  }

  const stack = [...(childrenByParent.get(ancestorId) ?? [])];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (currentId === candidateId) return true;
    stack.push(...(childrenByParent.get(String(currentId)) ?? []));
  }

  return false;
}
