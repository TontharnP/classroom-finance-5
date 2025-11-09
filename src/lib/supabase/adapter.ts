/**
 * Adapter to convert between UI types (camelCase) and Supabase types (snake_case)
 */

import type { Student as UIStudent, Schedule as UISchedule, Transaction as UITransaction, Category as UICategory } from "@/types";
import type { Student as DbStudent, Schedule as DbSchedule, Transaction as DbTransaction } from "@/types/supabase";
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
    category: db.category,
    source: db.source,
    scheduleId: db.schedule_id,
    studentId: db.student_id,
    createdAt: db.created_at,
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
    category: transaction.category,
    description: undefined,
    source: transaction.source,
    schedule_id: transaction.scheduleId,
    student_id: transaction.studentId,
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
