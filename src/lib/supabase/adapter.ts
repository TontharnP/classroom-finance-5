/**
 * Adapter to convert between UI types (camelCase) and database types (snake_case)
 */

import type { Student as UIStudent, Schedule as UISchedule, ScheduleFolder as UIScheduleFolder, Transaction as UITransaction, Category as UICategory, LinePaymentRequest as UILinePaymentRequest } from "@/types";
import type { Student as DbStudent, Schedule as DbSchedule, ScheduleFolder as DbScheduleFolder, Transaction as DbTransaction, LinePaymentRequest as DbLinePaymentRequest } from "@/types/supabase";
import type { Category as DbCategory } from "@/types/supabase-category";

// Student adapters
export function dbStudentToStudent(db: DbStudent): UIStudent {
  return {
    id: db.id,
    prefix: db.prefix,
    firstName: db.first_name,
    lastName: db.last_name,
    nickName: db.nick_name,
    number: db.number,
    avatarUrl: db.avatar_url,
    lineUserId: db.line_user_id,
  };
}

export function studentToDbStudent(student: Omit<UIStudent, "id">): Omit<DbStudent, "id" | "created_at" | "updated_at"> {
  return {
    prefix: student.prefix,
    first_name: student.firstName,
    last_name: student.lastName,
    nick_name: student.nickName,
    number: student.number,
    avatar_url: student.avatarUrl,
    line_user_id: student.lineUserId,
  };
}

// Schedule adapters
export function dbScheduleToSchedule(db: DbSchedule): UISchedule {
  return {
    id: db.id,
    name: db.name,
    amountPerItem: db.amount_per_item,
    startDate: db.start_date,
    endDate: db.end_date,
    details: db.description,
    studentIds: db.student_ids,
    folderId: db.folder_id,
    sortOrder: db.sort_order,
  };
}

export function scheduleToDbSchedule(schedule: Omit<UISchedule, "id">): Omit<DbSchedule, "id" | "created_at" | "updated_at"> {
  return {
    name: schedule.name,
    amount_per_item: schedule.amountPerItem,
    start_date: schedule.startDate,
    end_date: schedule.endDate,
    description: schedule.details,
    student_ids: schedule.studentIds,
    folder_id: schedule.folderId,
    sort_order: schedule.sortOrder,
  };
}

export function dbScheduleFolderToScheduleFolder(db: DbScheduleFolder): UIScheduleFolder {
  return {
    id: db.id,
    name: db.name,
    parentId: db.parent_id,
    sortOrder: db.sort_order,
    isHidden: db.is_hidden,
  };
}

export function scheduleFolderToDbScheduleFolder(
  folder: Omit<UIScheduleFolder, "id">
): Omit<DbScheduleFolder, "id" | "created_at" | "updated_at"> {
  return {
    name: folder.name,
    parent_id: folder.parentId,
    sort_order: folder.sortOrder,
    is_hidden: folder.isHidden,
  };
}

// Transaction adapters
export function dbTransactionToTransaction(db: DbTransaction): UITransaction {
  // Migrate old "bank" values to "kplus" for backward compatibility
  let method = db.method;
  if (method === "bank") {
    method = "kplus";
  }

  return {
    id: db.id,
    name: db.name,
    kind: db.kind,
    amount: db.amount,
    method: method as UITransaction["method"],
    categoryId: db.category_id,
    category: db.category,
    source: db.source,
    scheduleId: db.schedule_id,
    studentId: db.student_id,
    createdAt: db.created_at,
    pocketId: db.pocket_id,
    sourcePocketId: db.source_pocket_id,
    destinationPocketId: db.destination_pocket_id,
  };
}

export function transactionToDbTransaction(
  transaction: Omit<UITransaction, "id" | "createdAt">
): Omit<DbTransaction, "id" | "created_at" | "updated_at"> {
  return {
    name: transaction.name,
    kind: transaction.kind,
    amount: transaction.amount,
    method: transaction.method,
    category_id: transaction.categoryId,
    category: transaction.category,
    description: undefined,
    source: transaction.source,
    schedule_id: transaction.scheduleId,
    student_id: transaction.studentId,
    pocket_id: transaction.pocketId,
    source_pocket_id: transaction.sourcePocketId,
    destination_pocket_id: transaction.destinationPocketId,
  };
}

export function dbLinePaymentRequestToLinePaymentRequest(db: DbLinePaymentRequest): UILinePaymentRequest {
  return {
    id: db.id,
    lineUserId: db.line_user_id,
    studentId: db.student_id,
    scheduleId: db.schedule_id,
    method: db.method as UILinePaymentRequest["method"],
    amount: db.amount,
    status: db.status,
    slipUrl: db.slip_url,
    slipPathname: db.slip_pathname,
    slipStatus: db.slip_status,
    slipQrPayload: db.slip_qr_payload,
    slipImageHash: db.slip_image_hash,
    slipTransactionId: db.slip_transaction_id,
    slipOcrText: db.slip_ocr_text,
    slipAutoCheckResult: db.slip_auto_check_result,
    transactionId: db.transaction_id,
    note: db.note,
    reviewedBy: db.reviewed_by,
    reviewedAt: db.reviewed_at,
    rejectReason: db.reject_reason,
    paidAt: db.paid_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// Category adapters
export function dbCategoryToCategory(db: DbCategory): UICategory {
  return {
    id: db.id,
    name: db.name,
    icon: db.icon,
  };
}

export function categoryToDbCategory(category: Omit<UICategory, "id">): Omit<DbCategory, "id" | "created_at" | "updated_at"> {
  return {
    name: category.name,
    icon: category.icon,
  };
}
