import { notFound, ok, serverError } from "@/lib/api/response";
import { getRecord, updateRecord, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest } from "@/lib/supabase/mappers";
import { rejectLinePaymentRequest } from "@/lib/server/linePaymentReview";
import type { LinePaymentRequestUpdate } from "@/types/supabase";

type RouteContext = { params: Promise<{ id: string }> };

const requestColumns = [
  "status",
  "method",
  "slip_url",
  "slip_pathname",
  "slip_status",
  "slip_qr_payload",
  "slip_image_hash",
  "slip_ocr_text",
  "slip_auto_check_result",
  "transaction_id",
  "note",
  "reviewed_by",
  "reviewed_at",
  "reject_reason",
  "paid_at",
];

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
    const previousRow = await getRecord<Row>("line_payment_requests", id);
    if (!previousRow) return notFound("Line payment request not found");

    if (body.status === "rejected") {
      return ok(await rejectLinePaymentRequest({
        requestId: id,
        reviewerLineUserId: "web",
        reason: body.reject_reason || body.note || "Rejected by treasurer",
      }));
    }

    const row = await updateRecord<Row>("line_payment_requests", id, body, requestColumns);
    if (!row) return notFound("Line payment request not found");
    return ok(mapLinePaymentRequest(row));
  } catch (error) {
    return serverError(error);
  }
}
