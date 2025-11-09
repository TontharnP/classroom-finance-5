// Student type matching Supabase schema
export type Student = {
  id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  nick_name?: string;
  number: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

// Schedule type matching Supabase schema
export type Schedule = {
  id: string;
  name: string;
  amount_per_item: number;
  start_date: string;
  end_date?: string;
  description?: string;
  student_ids: string[];
  created_at: string;
  updated_at: string;
};

// Transaction type matching Supabase schema
// Note: "bank" is included for backward compatibility during migration
export type Transaction = {
  id: string;
  name: string;
  kind: "income" | "expense";
  amount: number;
  method?: "kplus" | "cash" | "truemoney" | "bank"; // "bank" for migration compatibility
  category?: string;
  description?: string;
  source: "transaction" | "schedule";
  schedule_id?: string;
  student_id?: string;
  created_at: string;
  updated_at: string;
};

// Input types (without auto-generated fields)
export type StudentInput = Omit<Student, "id" | "created_at" | "updated_at">;
export type ScheduleInput = Omit<Schedule, "id" | "created_at" | "updated_at">;
export type TransactionInput = Omit<Transaction, "id" | "created_at" | "updated_at">;

// Update types (partial without auto-generated fields)
export type StudentUpdate = Partial<Omit<Student, "id" | "created_at" | "updated_at">>;
export type ScheduleUpdate = Partial<Omit<Schedule, "id" | "created_at" | "updated_at">>;
export type TransactionUpdate = Partial<Omit<Transaction, "id" | "created_at" | "updated_at">>;
