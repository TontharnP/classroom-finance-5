export type PaymentMethod = "kplus" | "cash" | "truemoney";
export type TxnKind = "income" | "expense" | "transfer";
export type TxnSource = "transaction" | "schedule";
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

export interface Pocket {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

export interface Student {
  id: string;
  number: number; // เลขที่
  prefix: string; // คำนำหน้า
  firstName: string;
  lastName: string;
  nickName?: string;
  avatarUrl?: string;
  lineUserId?: string;
}

export interface Schedule {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  details?: string;
  amountPerItem: number; // จำนวนที่ต้องเก็บต่อรายการ
  studentIds: string[]; // รายชื่อที่ต้องเก็บ
  folderId: string;
  sortOrder: number;
}

export interface ScheduleFolder {
  id: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  isHidden?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: string; // URL or path to icon
}

export interface Transaction {
  id: string;
  name: string; // ชื่อรายการ
  source: TxnSource; // มาจาก ธุรกรรมปกติ หรือ กำหนดการ
  kind: TxnKind; // รายรับ/รายจ่าย/โอนย้าย
  amount: number;
  method?: PaymentMethod; // ประเภทการชำระ
  categoryId?: string; // Category ID reference
  category?: string; // Kept for backward compatibility
  scheduleId?: string; // ถ้ามาจากกำหนดการ
  studentId?: string; // ถ้ามาจากกำหนดการ
  createdAt: string; // ISO datetime
  pocketId?: string; // สำหรับระบุว่าเงินเข้ากระเป๋าไหน
  sourcePocketId?: string; // สำหรับการโอน: จากกระเป๋าไหน
  destinationPocketId?: string; // สำหรับการโอน: ไปกระเป๋าไหน
  slipUrl?: string;
  slipPathname?: string;
}

export interface LinePaymentRequest {
  id: string;
  lineUserId: string;
  studentId: string;
  scheduleId: string;
  method?: PaymentMethod;
  amount: number;
  status: LinePaymentRequestStatus;
  slipUrl?: string;
  slipPathname?: string;
  slipStatus?: SlipStatus;
  slipQrPayload?: string;
  slipImageHash?: string;
  slipTransactionId?: string;
  slipOcrText?: string;
  slipAutoCheckResult?: string;
  transactionId?: string;
  note?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectReason?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataBundle {
  students: Student[];
  schedules: Schedule[];
  scheduleFolders: ScheduleFolder[];
  transactions: Transaction[];
  linePaymentRequests?: LinePaymentRequest[];
  categories: Category[];
  pockets: Pocket[];
}
