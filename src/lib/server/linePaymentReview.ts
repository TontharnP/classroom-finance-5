import "server-only";

import { createRecord, getRecord, getSupabaseAdmin, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest, mapTransaction } from "@/lib/supabase/mappers";
import { pushLineText } from "@/lib/server/line";

const REVIEWABLE_STATUSES = ["pending_slip_review", "pending_review", "cash_pending"];

export async function approveLinePaymentRequest({
  requestId,
  reviewerLineUserId,
}: {
  requestId: string;
  reviewerLineUserId: string;
}) {
  const existingRow = await getRecord<Row>("line_payment_requests", requestId);
  if (!existingRow) throw new Error("Line payment request not found");
  const existing = mapLinePaymentRequest(existingRow);

  if (existing.status === "approved" && existing.transaction_id) {
    const transaction = await getRecord<Row>("transactions", existing.transaction_id);
    return {
      request: existing,
      transaction: transaction ? mapTransaction(transaction) : null,
    };
  }

  if (!REVIEWABLE_STATUSES.includes(existing.status)) {
    throw new Error("Only pending payment requests can be approved");
  }

  const now = new Date().toISOString();
  const { data: lockedRow, error: lockError } = await getSupabaseAdmin()
    .from("line_payment_requests")
    .update({
      status: "approved",
      slip_status: "approved",
      reviewed_by: reviewerLineUserId,
      reviewed_at: now,
      paid_at: now,
    })
    .eq("id", requestId)
    .in("status", REVIEWABLE_STATUSES)
    .select("*")
    .maybeSingle();

  if (lockError) throw lockError;
  if (!lockedRow) {
    const latest = await getRecord<Row>("line_payment_requests", requestId);
    if (latest) {
      const request = mapLinePaymentRequest(latest);
      if (request.status === "approved" && request.transaction_id) {
        const transaction = await getRecord<Row>("transactions", request.transaction_id);
        return {
          request,
          transaction: transaction ? mapTransaction(transaction) : null,
        };
      }
    }
    throw new Error("Payment request is already being reviewed");
  }

  const paymentRequest = mapLinePaymentRequest(lockedRow);
  const schedule = await getRecord<Row>("schedules", paymentRequest.schedule_id);
  if (!schedule) throw new Error("Schedule not found");

  const method = paymentRequest.method || "cash";
  const transaction = await createRecord<Row>("transactions", {
    name: String(schedule.name),
    kind: "income",
    amount: paymentRequest.amount,
    method,
    category: "การชำระเงินตามกำหนดการ",
    category_id: null,
    description: paymentRequest.slip_url
      ? `LINE payment proof: ${paymentRequest.slip_url}`
      : "LINE cash payment approved",
    source: "schedule",
    schedule_id: paymentRequest.schedule_id,
    student_id: paymentRequest.student_id,
    pocket_id: `pocket-${method}`,
    source_pocket_id: null,
    destination_pocket_id: null,
  });

  const { data: updatedRow, error: updateError } = await getSupabaseAdmin()
    .from("line_payment_requests")
    .update({ transaction_id: transaction.id })
    .eq("id", requestId)
    .select("*")
    .maybeSingle();

  if (updateError) throw updateError;

  await pushLineText(paymentRequest.line_user_id, [
    "สลิปผ่านแล้วครับ ✅",
    "ชำระเงินเรียบร้อย ขอบคุณมากครับ 🙌",
  ].join("\n"));

  return {
    request: mapLinePaymentRequest(updatedRow || lockedRow),
    transaction: mapTransaction(transaction),
  };
}

export async function rejectLinePaymentRequest({
  requestId,
  reviewerLineUserId,
  reason,
}: {
  requestId: string;
  reviewerLineUserId: string;
  reason: string;
}) {
  const cleanReason = reason.trim() || "เหรัญญิกยังไม่สามารถตรวจสอบสลิปนี้ได้";
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("line_payment_requests")
    .update({
      status: "rejected",
      slip_status: "rejected",
      reviewed_by: reviewerLineUserId,
      reviewed_at: now,
      reject_reason: cleanReason,
    })
    .eq("id", requestId)
    .in("status", REVIEWABLE_STATUSES)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Only pending payment requests can be rejected");

  const request = mapLinePaymentRequest(data);
  await pushLineText(request.line_user_id, [
    "สลิปยังไม่ผ่านการตรวจสอบนะครับ 😅",
    `เหตุผล: ${cleanReason}`,
    "กรุณาส่งสลิปใหม่อีกครั้งได้เลย",
  ].join("\n"));

  return request;
}
