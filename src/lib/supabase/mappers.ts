import { toNumber, type Row } from "./server";
import type { Student, Schedule, ScheduleFolder, Transaction, LinePaymentRequest } from "@/types/supabase";
import type { Category } from "@/types/supabase-category";

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toDateOnly(value: unknown): string {
  return toIso(value).split("T")[0];
}

export function mapStudent(row: Row): Student {
  return {
    id: String(row.id),
    prefix: String(row.prefix),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    nick_name: row.nick_name ? String(row.nick_name) : undefined,
    number: Number(row.number),
    avatar_url: row.avatar_url ? String(row.avatar_url) : undefined,
    line_user_id: row.line_user_id ? String(row.line_user_id) : undefined,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export function mapSchedule(row: Row): Schedule {
  return {
    id: String(row.id),
    name: String(row.name),
    amount_per_item: toNumber(row.amount_per_item),
    start_date: toDateOnly(row.start_date),
    end_date: row.end_date ? toDateOnly(row.end_date) : undefined,
    description: row.description ? String(row.description) : undefined,
    student_ids: Array.isArray(row.student_ids) ? row.student_ids.map(String) : [],
    folder_id: row.folder_id ? String(row.folder_id) : "default",
    sort_order: Number(row.sort_order ?? 0),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export function mapScheduleFolder(row: Row): ScheduleFolder {
  return {
    id: String(row.id),
    name: String(row.name),
    parent_id: row.parent_id ? String(row.parent_id) : undefined,
    sort_order: Number(row.sort_order ?? 0),
    is_hidden: Boolean(row.is_hidden ?? false),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export function mapTransaction(row: Row): Transaction {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: row.kind as Transaction["kind"],
    amount: toNumber(row.amount),
    method: row.method ? (String(row.method) as Transaction["method"]) : undefined,
    category: row.category ? String(row.category) : undefined,
    category_id: row.category_id ? String(row.category_id) : undefined,
    description: row.description ? String(row.description) : undefined,
    source: row.source as Transaction["source"],
    schedule_id: row.schedule_id ? String(row.schedule_id) : undefined,
    student_id: row.student_id ? String(row.student_id) : undefined,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    pocket_id: row.pocket_id ? String(row.pocket_id) : undefined,
    source_pocket_id: row.source_pocket_id ? String(row.source_pocket_id) : undefined,
    destination_pocket_id: row.destination_pocket_id ? String(row.destination_pocket_id) : undefined,
    slip_url: row.slip_url ? String(row.slip_url) : undefined,
    slip_pathname: row.slip_pathname ? String(row.slip_pathname) : undefined,
  };
}

export function mapLinePaymentRequest(row: Row): LinePaymentRequest {
  return {
    id: String(row.id),
    line_user_id: String(row.line_user_id),
    student_id: String(row.student_id),
    schedule_id: String(row.schedule_id),
    method: row.method ? (String(row.method) as LinePaymentRequest["method"]) : undefined,
    amount: toNumber(row.amount),
    status: String(row.status) as LinePaymentRequest["status"],
    slip_url: row.slip_url ? String(row.slip_url) : undefined,
    slip_pathname: row.slip_pathname ? String(row.slip_pathname) : undefined,
    slip_status: row.slip_status ? (String(row.slip_status) as LinePaymentRequest["slip_status"]) : undefined,
    slip_qr_payload: row.slip_qr_payload ? String(row.slip_qr_payload) : undefined,
    slip_image_hash: row.slip_image_hash ? String(row.slip_image_hash) : undefined,
    slip_transaction_id: row.slip_transaction_id ? String(row.slip_transaction_id) : undefined,
    slip_ocr_text: row.slip_ocr_text ? String(row.slip_ocr_text) : undefined,
    slip_auto_check_result: row.slip_auto_check_result ? String(row.slip_auto_check_result) : undefined,
    transaction_id: row.transaction_id ? String(row.transaction_id) : undefined,
    note: row.note ? String(row.note) : undefined,
    reviewed_by: row.reviewed_by ? String(row.reviewed_by) : undefined,
    reviewed_at: row.reviewed_at ? toIso(row.reviewed_at) : undefined,
    reject_reason: row.reject_reason ? String(row.reject_reason) : undefined,
    paid_at: row.paid_at ? toIso(row.paid_at) : undefined,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export function mapCategory(row: Row): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    icon: row.icon ? String(row.icon) : undefined,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}
