import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { createRecord, getRecord, updateRecord, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest, mapTransaction } from "@/lib/supabase/mappers";
import { pushLineText } from "@/lib/server/line";

type RouteContext = { params: Promise<{ id: string }> };

const requestColumns = ["status", "transaction_id", "note"];

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = await getRecord<Row>("line_payment_requests", id);
    if (!row) return notFound("Line payment request not found");
    const paymentRequest = mapLinePaymentRequest(row);

    if (paymentRequest.status === "approved" && paymentRequest.transaction_id) {
      const transaction = await getRecord<Row>("transactions", paymentRequest.transaction_id);
      return ok({ request: paymentRequest, transaction: transaction ? mapTransaction(transaction) : null });
    }

    if (!["pending_review", "cash_pending"].includes(paymentRequest.status)) {
      return badRequest("Only pending payment requests can be approved");
    }

    const schedule = await getRecord<Row>("schedules", paymentRequest.schedule_id);
    if (!schedule) return notFound("Schedule not found");

    const method = paymentRequest.method || "cash";
    const transaction = await createRecord<Row>("transactions", {
      name: String(schedule.name),
      kind: "income",
      amount: paymentRequest.amount,
      method,
      category: "การชำระเงินตามกำหนดการ",
      category_id: null,
      description: paymentRequest.slip_url ? `LINE payment proof: ${paymentRequest.slip_url}` : "LINE cash payment approved",
      source: "schedule",
      schedule_id: paymentRequest.schedule_id,
      student_id: paymentRequest.student_id,
      pocket_id: `pocket-${method}`,
      source_pocket_id: null,
      destination_pocket_id: null,
    });

    const updated = await updateRecord<Row>(
      "line_payment_requests",
      id,
      { status: "approved", transaction_id: transaction.id },
      requestColumns
    );

    const notification = await pushLineText(paymentRequest.line_user_id, [
      "ยืนยันการชำระเงินเรียบร้อยแล้วครับ ✅",
      "ภารกิจจ่ายเงินสำเร็จ",
      "",
      `รายการ: ${String(schedule.name)}`,
      `ยอดเงิน: ${paymentRequest.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`,
      `ช่องทาง: ${formatMethod(method)}`,
      "สถานะ: อนุมัติแล้ว",
      "",
      "ขอบคุณที่ชำระเงินครับ 🙏",
    ].join("\n"));

    return ok({
      request: mapLinePaymentRequest(updated || row),
      transaction: mapTransaction(transaction),
      notification,
    });
  } catch (error) {
    return serverError(error);
  }
}

function formatMethod(method: string) {
  if (method === "kplus") return "K PLUS";
  if (method === "truemoney") return "TrueMoney";
  if (method === "cash") return "เงินสด";
  return method;
}
