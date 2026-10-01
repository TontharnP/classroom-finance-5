import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { verifyLineStatusToken } from "@/lib/server/lineStatusLink";
import { mapStudent } from "@/lib/supabase/mappers";
import { getSupabaseAdmin, updateRecord, type Row } from "@/lib/supabase/server";

const editableColumns = ["nick_name"];

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { token?: unknown; nickName?: unknown } | null;
    const token = typeof body?.token === "string" ? body.token : undefined;
    const payload = verifyLineStatusToken(token);
    if (!payload) return notFound();

    if (typeof body?.nickName !== "string") return badRequest("กรุณาระบุชื่อเล่น");
    const nickName = body.nickName.replace(/\s+/g, " ").trim();
    if (nickName.length > 50) return badRequest("ชื่อเล่นต้องมีความยาวไม่เกิน 50 ตัวอักษร");

    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .select("*")
      .eq("line_user_id", payload.userId)
      .order("number", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return notFound();
    const student = mapStudent(data as Row);

    const updated = await updateRecord<Row>(
      "students",
      student.id,
      { nick_name: nickName || null },
      editableColumns
    );
    if (!updated) return notFound();

    return ok({ nickName: mapStudent(updated).nick_name || null });
  } catch (error) {
    return serverError(error);
  }
}
