// Student type matching database schema
export type Student = {
  id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  nick_name?: string;
  number: number;
  avatar_url?: string;
  line_user_id?: string;
  created_at: string;
  updated_at: string;
};

// Schedule type matching database schema
export type Schedule = {
  id: string;
  name: string;
  amount_per_item: number;
  start_date: string;
  end_date?: string;
  description?: string;
  student_ids: string[];
  folder_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ScheduleFolder = {
  id: string;
  name: string;
  parent_id?: string;
  sort_order: number;
  is_hidden?: boolean;
  created_at: string;
  updated_at: string;
};

// Transaction type matching database schema
// Note: "bank" is included for backward compatibility during migration
export type Transaction = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
  amount: number;
  method?: "kplus" | "cash" | "truemoney" | "bank"; // "bank" for migration compatibility
  category?: string;
  category_id?: string;
  description?: string;
  source: "transaction" | "schedule";
  schedule_id?: string;
  student_id?: string;
  created_at: string;
  updated_at: string;
  pocket_id?: string;
  source_pocket_id?: string;
  destination_pocket_id?: string;
};

export type LinePaymentRequestStatus =
  | "selecting"
  | "awaiting_slip"
  | "pending_review"
  | "pending_slip_review"
  | "cash_pending"
  | "approved"
  | "rejected"
  | "expired";

export type SlipStatus =
  | "pending_slip_review"
  | "approved"
  | "rejected"
  | "duplicate_suspected"
  | "wrong_amount";

export type LinePaymentRequest = {
  id: string;
  line_user_id: string;
  student_id: string;
  schedule_id: string;
  method?: "kplus" | "cash" | "truemoney";
  amount: number;
  status: LinePaymentRequestStatus;
  slip_url?: string;
  slip_pathname?: string;
  slip_status?: SlipStatus;
  slip_qr_payload?: string;
  slip_image_hash?: string;
  slip_ocr_text?: string;
  slip_auto_check_result?: string;
  transaction_id?: string;
  note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reject_reason?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
};

// Input types (without auto-generated fields)
export type StudentInput = Omit<Student, "id" | "created_at" | "updated_at">;
export type ScheduleInput = Omit<Schedule, "id" | "created_at" | "updated_at">;
export type ScheduleFolderInput = Omit<ScheduleFolder, "id" | "created_at" | "updated_at">;
export type TransactionInput = Omit<Transaction, "id" | "created_at" | "updated_at">;
export type LinePaymentRequestInput = Omit<LinePaymentRequest, "id" | "created_at" | "updated_at">;

// Update types (partial without auto-generated fields)
export type StudentUpdate = Partial<Omit<Student, "id" | "created_at" | "updated_at" | "nick_name" | "avatar_url" | "line_user_id">> & {
  nick_name?: string | null;
  avatar_url?: string | null;
  line_user_id?: string | null;
};
export type ScheduleUpdate = Partial<Omit<Schedule, "id" | "created_at" | "updated_at" | "end_date" | "description">> & {
  end_date?: string | null;
  description?: string | null;
};
export type ScheduleFolderUpdate = Partial<Omit<ScheduleFolder, "id" | "created_at" | "updated_at">>;
export type TransactionUpdate = Partial<Omit<Transaction, "id" | "created_at" | "updated_at" | "method" | "category" | "category_id" | "description" | "schedule_id" | "student_id" | "pocket_id" | "source_pocket_id" | "destination_pocket_id">> & {
  method?: Transaction["method"] | null;
  category?: string | null;
  category_id?: string | null;
  description?: string | null;
  schedule_id?: string | null;
  student_id?: string | null;
  pocket_id?: string | null;
  source_pocket_id?: string | null;
  destination_pocket_id?: string | null;
};
export type LinePaymentRequestUpdate = Partial<Omit<LinePaymentRequest, "id" | "created_at" | "updated_at" | "method" | "slip_url" | "slip_pathname" | "slip_status" | "slip_qr_payload" | "slip_image_hash" | "slip_ocr_text" | "slip_auto_check_result" | "transaction_id" | "note" | "reviewed_by" | "reviewed_at" | "reject_reason" | "paid_at">> & {
  method?: LinePaymentRequest["method"] | null;
  slip_url?: string | null;
  slip_pathname?: string | null;
  slip_status?: LinePaymentRequest["slip_status"] | null;
  slip_qr_payload?: string | null;
  slip_image_hash?: string | null;
  slip_ocr_text?: string | null;
  slip_auto_check_result?: string | null;
  transaction_id?: string | null;
  note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reject_reason?: string | null;
  paid_at?: string | null;
};
