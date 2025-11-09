export type PaymentMethod = "kplus" | "cash" | "truemoney";
export type TxnKind = "income" | "expense";
export type TxnSource = "transaction" | "schedule";

export interface Student {
  id: string;
  number: number; // เลขที่
  prefix: string; // คำนำหน้า
  firstName: string;
  lastName: string;
  nickName?: string;
  avatarUrl?: string;
}

export interface Schedule {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  details?: string;
  amountPerItem: number; // จำนวนที่ต้องเก็บต่อรายการ
  studentIds: string[]; // รายชื่อที่ต้องเก็บ
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
  kind: TxnKind; // รายรับ/รายจ่าย
  amount: number;
  method?: PaymentMethod; // ประเภทการชำระ
  categoryId?: string; // Category ID reference
  category?: string; // Kept for backward compatibility
  scheduleId?: string; // ถ้ามาจากกำหนดการ
  studentId?: string; // ถ้ามาจากกำหนดการ
  createdAt: string; // ISO datetime
}

export interface DataBundle {
  students: Student[];
  schedules: Schedule[];
  transactions: Transaction[];
  categories: Category[];
}
