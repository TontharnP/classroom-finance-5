import "server-only";

import { getSupabaseAdmin, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest, mapTransaction } from "@/lib/supabase/mappers";
import { pushLineText } from "@/lib/server/line";
import { deleteSlipImages } from "@/lib/server/slipStorage";

const REVIEWABLE_STATUSES = ["pending_slip_review", "pending_review", "cash_pending"];
const MAX_APPROVED_SLIPS_PER_LINE_USER = 6;

export async function approveLinePaymentRequest({
  requestId,
  reviewerLineUserId,
  notifyStudent = true,
}: {
  requestId: string;
  reviewerLineUserId: string;
  notifyStudent?: boolean;
}) {
  const { data, error } = await getSupabaseAdmin().rpc("approve_schedule_line_payment", {
    p_request_id: requestId,
    p_reviewer: reviewerLineUserId,
  });
  if (error) throw error;

  const request = mapLinePaymentRequest(data.request);
  const transactions = (data.transactions as Row[]).map((row) => mapTransaction(
    row.id === request.transaction_id ? { ...row, slip_url: request.slip_url, slip_pathname: request.slip_pathname } : row
  ));
  await enforceApprovedSlipRetention(request.line_user_id).catch((error) => {
    console.error("Failed to enforce approved slip retention", error);
  });

  if (notifyStudent) {
    await pushLineText(request.line_user_id, "เหรัญญิกยืนยันการชำระเงินแล้วครับ ✅").catch((error) => {
      console.error("Failed to send payment confirmation", error);
    });
  }

  return { request, transaction: transactions[0], transactions };
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
  const cleanReason = reason.trim() || "เหรัญญิกตรวจสอบสลิปนี้ไม่ผ่านครับ";
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
    "สลิปนี้ยังผ่านไม่ได้นะครับ 😅",
    cleanReason,
    "ลองส่งสลิปใหม่มาอีกทีได้เลยครับ",
  ].join("\n"));

  await deleteRejectedSlipImage(request.slip_pathname);
  await deleteCompletedPaymentRequest(request.id);

  return request;
}

async function enforceApprovedSlipRetention(lineUserId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("line_payment_slip_archives")
    .select("id, slip_pathname")
    .eq("line_user_id", lineUserId)
    .not("slip_pathname", "is", null)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const staleRows = (data || []).slice(MAX_APPROVED_SLIPS_PER_LINE_USER);
  const stalePathnames = staleRows
    .map((row) => typeof row.slip_pathname === "string" ? row.slip_pathname : "")
    .filter(Boolean);
  if (staleRows.length === 0 || stalePathnames.length === 0) return;

  await deleteSlipImages(stalePathnames);

  const staleIds = staleRows.map((row) => String(row.id)).filter(Boolean);
  const { error: updateError } = await getSupabaseAdmin()
    .from("line_payment_slip_archives")
    .update({ slip_url: null, slip_pathname: null })
    .in("id", staleIds);

  if (updateError) throw updateError;
}

async function deleteCompletedPaymentRequest(requestId: string) {
  const { error } = await getSupabaseAdmin()
    .from("line_payment_requests")
    .delete()
    .eq("id", requestId);

  if (error) throw error;
}

async function deleteRejectedSlipImage(pathname: string | undefined) {
  if (!pathname) return;

  await deleteSlipImages([pathname]).catch((error) => {
    console.error("Failed to delete rejected slip image", error);
  });
}
