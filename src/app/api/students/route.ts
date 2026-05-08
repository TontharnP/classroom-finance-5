import { badRequest, ok, serverError } from "@/lib/api/response";
import { createRecord, emptyToNull, listRecords, type Row } from "@/lib/supabase/server";
import { mapStudent } from "@/lib/supabase/mappers";
import type { StudentInput } from "@/types/supabase";

export async function GET() {
  try {
    const rows = (await listRecords<Row>("students")).sort(
      (a, b) => Number(a.number ?? 0) - Number(b.number ?? 0)
    );
    return ok(rows.map(mapStudent));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StudentInput | StudentInput[];
    const inputs = Array.isArray(body) ? body : [body];

    if (inputs.length === 0) return badRequest("At least one student is required");

    const rows = await Promise.all(
      inputs.map((student) =>
        createRecord<Row>("students", {
          prefix: student.prefix,
          first_name: student.first_name,
          last_name: student.last_name,
          nick_name: emptyToNull(student.nick_name),
          number: student.number,
          avatar_url: emptyToNull(student.avatar_url),
        })
      )
    );
    const students = rows.map(mapStudent);
    return ok(Array.isArray(body) ? students : students[0], 201);
  } catch (error) {
    return serverError(error);
  }
}
