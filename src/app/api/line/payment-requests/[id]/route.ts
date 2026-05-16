import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { getRecord, updateRecord, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest } from "@/lib/supabase/mappers";
import { pushLineText } from "@/lib/server/line";
import type { LinePaymentRequest, LinePaymentRequestUpdate } from "@/types/supabase";

type RouteContext = { params: Promise<{ id: string }> };

const requestColumns = ["status", "method", "slip_url", "slip_pathname", "transaction_id", "note"];
const reviewOnlyFields = new Set([
  "status",
  "slip_status",
  "transaction_id",
  "reviewed_by",
  "reviewed_at",
  "reject_reason",
  "paid_at",
]);

function formatPaymentMethod(method: LinePaymentRequest["method"]) {
  if (method === "cash") return "เงินสด";
  if (method === "truemoney") return "TrueMoney";
  if (method === "kplus") return "K PLUS";
  return "ยังไม่ระบุ";
}

async function notifyRejectedPayment(request: LinePaymentRequest) {
  const scheduleRow = await getRecord<Row>("schedules", request.schedule_id).catch(() => null);
  const scheduleName = scheduleRow?.name ? String(scheduleRow.name) : "รายการชำระเงิน";
  const method = formatPaymentMethod(request.method);

  const message = [
    "สลิป/รายการชำระเงินยังไม่ผ่านการตรวจสอบครับ 🙏",
    "",
    `รายการ: ${scheduleName}`,
    `ยอดเงิน: ${request.amount.toLocaleString()} บาท`,
    `ช่องทาง: ${method}`,
    "",
    "เหรัญญิกยังไม่สามารถอนุมัติรายการนี้ได้ในตอนนี้",
    "กรุณาตรวจสอบสลิปหรือทำรายการใหม่ผ่านเมนู ชำระเงิน อีกครั้งนะครับ",
  ].join("\n");

  return pushLineText(request.line_user_id, message);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await getRecord<Row>("line_payment_requests", id);
    if (!row) return notFound("Line payment request not found");
    return ok(mapLinePaymentRequest(row));
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as LinePaymentRequestUpdate;
    if (Object.keys(body).some((key) => reviewOnlyFields.has(key))) {
      return badRequest("Review decisions must be made from the treasurer LINE account.");
    }
    const previousRow = await getRecord<Row>("line_payment_requests", id);
    if (!previousRow) return notFound("Line payment request not found");
    const previous = mapLinePaymentRequest(previousRow);

    const row = await updateRecord<Row>("line_payment_requests", id, body, requestColumns);
    if (!row) return notFound("Line payment request not found");
    const updated = mapLinePaymentRequest(row);

    if (updated.status === "rejected" && previous.status !== "rejected") {
      const notification = await notifyRejectedPayment(updated);
      if (!notification.ok) {
        console.error("Failed to notify rejected LINE payment", notification.error);
      }
    }

    return ok(updated);
  } catch (error) {
    return serverError(error);
  }
}
