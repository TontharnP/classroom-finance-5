import { ok, serverError } from "@/lib/api/response";
import { createRecord, emptyToNull, listRecords, type Row } from "@/lib/supabase/server";
import { mapCategory } from "@/lib/supabase/mappers";
import type { CategoryInput } from "@/types/supabase-category";

export async function GET() {
  try {
    const rows = (await listRecords<Row>("categories")).sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""))
    );
    return ok(rows.map(mapCategory));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CategoryInput;
    const row = await createRecord<Row>("categories", {
      name: body.name,
      icon: emptyToNull(body.icon),
    });
    return ok(mapCategory(row), 201);
  } catch (error) {
    return serverError(error);
  }
}
