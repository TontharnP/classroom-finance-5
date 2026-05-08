import { noContent, notFound, ok, serverError } from "@/lib/api/response";
import { deleteRecord, getRecord, updateRecord, type Row } from "@/lib/supabase/server";
import { mapCategory } from "@/lib/supabase/mappers";
import type { CategoryUpdate } from "@/types/supabase-category";

type RouteContext = { params: Promise<{ id: string }> };

const categoryColumns = ["name", "icon"];

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await getRecord<Row>("categories", id);
    if (!row) return notFound("Category not found");
    return ok(mapCategory(row));
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as CategoryUpdate;
    const row = await updateRecord<Row>("categories", id, body, categoryColumns);
    if (!row) return notFound("Category not found");
    return ok(mapCategory(row));
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteRecord("categories", id);
    if (!deleted) return notFound("Category not found");
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
