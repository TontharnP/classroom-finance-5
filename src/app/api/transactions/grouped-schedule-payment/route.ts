import { z } from "zod";
import { badRequest, ok, serverError } from "@/lib/api/response";
import { roundMoney } from "@/lib/additionalCosts";
import { mapTransaction } from "@/lib/supabase/mappers";
import { getSupabaseAdmin, type Row } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const studentId = z.uuid().safeParse(new URL(request.url).searchParams.get("studentId"));
  if (!studentId.success) return badRequest("รหัสนักเรียนไม่ถูกต้อง");

  try {
    const db = getSupabaseAdmin();
    const [schedules, balances] = await Promise.all([
      db.from("schedules").select("id,name").contains("student_ids", [studentId.data])
        .order("end_date", { nullsFirst: false }).order("start_date").order("id"),
      db.rpc("student_schedule_balances", { p_student_id: studentId.data }).gt("remaining", 0),
    ]);
    if (schedules.error) throw schedules.error;
    if (balances.error) throw balances.error;
    const remaining = new Map((balances.data as Row[]).map((row) => [String(row.schedule_id), Number(row.remaining)]));
    return ok(schedules.data.flatMap(({ id, name }) => {
      const amount = remaining.get(id);
      return amount === undefined ? [] : [{ id, name, amount }];
    }));
  } catch (error) {
    return serverError(error);
  }
}

const paymentInput = z.object({
  requestKey: z.uuid(),
  studentId: z.uuid(),
  method: z.enum(["cash", "kplus", "truemoney"]),
  pocketId: z.string().min(1).max(100).optional(),
  allocations: z.array(z.object({
    schedule_id: z.uuid(),
    amount: z.number().positive().max(99_999_999.99).refine((amount) => roundMoney(amount) === amount),
  })).min(2),
}).refine(({ allocations }) => new Set(allocations.map((item) => item.schedule_id)).size === allocations.length);

export async function POST(request: Request) {
  const parsed = paymentInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("กรุณาเลือกรายการชำระเงินอย่างน้อย 2 รายการและระบุยอดให้ถูกต้อง");

  const { requestKey, studentId, method, pocketId, allocations } = parsed.data;
  try {
    const { data, error } = await getSupabaseAdmin().rpc("record_grouped_schedule_payment", {
      p_request_key: requestKey,
      p_student_id: studentId,
      p_method: method,
      p_pocket_id: pocketId ?? null,
      p_allocations: allocations,
    });
    if (error?.code === "22023") return badRequest(error.message);
    if (error) throw error;
    return ok((data as Row[]).map(mapTransaction), 201);
  } catch (error) {
    return serverError(error);
  }
}
