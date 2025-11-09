import { supabase } from "../supabaseClient";
import type { Transaction, TransactionInput, TransactionUpdate } from "@/types/supabase";

/**
 * Fetch all transactions ordered by created date (newest first)
 */
export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single transaction by ID
 */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Error fetching transaction:", error);
    throw new Error(`Failed to fetch transaction: ${error.message}`);
  }

  return data;
}

/**
 * Fetch transactions by kind (income/expense)
 */
export async function getTransactionsByKind(kind: "income" | "expense"): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("kind", kind)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by kind:", error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch transactions by source (transaction/schedule)
 */
export async function getTransactionsBySource(source: "transaction" | "schedule"): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("source", source)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by source:", error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch transactions for a specific schedule
 */
export async function getTransactionsBySchedule(scheduleId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("schedule_id", scheduleId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by schedule:", error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch transactions for a specific student
 */
export async function getTransactionsByStudent(studentId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by student:", error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch transactions by month (YYYY-MM format)
 */
export async function getTransactionsByMonth(month: string): Promise<Transaction[]> {
  const startDate = `${month}-01`;
  const endDate = new Date(month + "-01");
  endDate.setMonth(endDate.getMonth() + 1);
  const endDateStr = endDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("created_at", startDate)
    .lt("created_at", endDateStr)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by month:", error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new transaction
 */
export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      name: input.name,
      kind: input.kind,
      amount: input.amount,
      method: input.method,
      category: input.category,
      description: input.description,
      source: input.source,
      schedule_id: input.schedule_id,
      student_id: input.student_id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating transaction:", error);
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  return data;
}

/**
 * Create multiple transactions (bulk insert)
 */
export async function createTransactions(inputs: TransactionInput[]): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(inputs)
    .select();

  if (error) {
    console.error("Error creating transactions:", error);
    throw new Error(`Failed to create transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a transaction
 */
export async function updateTransaction(id: string, updates: TransactionUpdate): Promise<Transaction> {
  console.log("Updating transaction with:", { id, updates });
  
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating transaction:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error hint:", error.hint);
    console.error("Error details:", error.details);
    
    // Check if it's a constraint violation
    if (error.code === "23514" || error.message?.includes("constraint") || error.message?.includes("check")) {
      throw new Error("Database constraint error: The payment method 'kplus' is not recognized. Please run the database migration (002_change_bank_to_kplus.sql) to update the CHECK constraint.");
    }
    
    throw new Error(`Failed to update transaction: ${error.message || "Unknown error"}`);
  }

  if (!data) {
    throw new Error("No data returned from update operation");
  }

  return data;
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting transaction:", error);
    throw new Error(`Failed to delete transaction: ${error.message}`);
  }
}

/**
 * Calculate total balance (income - expense)
 */
export async function getTotalBalance(): Promise<{
  income: number;
  expense: number;
  balance: number;
}> {
  const { data: incomeData, error: incomeError } = await supabase
    .from("transactions")
    .select("amount")
    .eq("kind", "income");

  const { data: expenseData, error: expenseError } = await supabase
    .from("transactions")
    .select("amount")
    .eq("kind", "expense");

  if (incomeError || expenseError) {
    console.error("Error calculating balance:", incomeError || expenseError);
    throw new Error("Failed to calculate balance");
  }

  const income = (incomeData || []).reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = (expenseData || []).reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = income - expense;

  return { income, expense, balance };
}

/**
 * Get income breakdown by payment method (for student collections only)
 */
export async function getIncomeByMethod(): Promise<{
  kplus: number;
  cash: number;
  truemoney: number;
  total: number;
}> {
  const { data, error } = await supabase
    .from("transactions")
    .select("method, amount")
    .eq("source", "schedule")
    .eq("kind", "income");

  if (error) {
    console.error("Error fetching income by method:", error);
    throw new Error("Failed to fetch income breakdown");
  }

  const breakdown = (data || []).reduce(
    (acc, t) => {
      const amount = Number(t.amount);
      if (t.method === "kplus") acc.kplus += amount;
      else if (t.method === "cash") acc.cash += amount;
      else if (t.method === "truemoney") acc.truemoney += amount;
      return acc;
    },
    { kplus: 0, cash: 0, truemoney: 0 }
  );

  return {
    ...breakdown,
    total: breakdown.kplus + breakdown.cash + breakdown.truemoney,
  };
}

/**
 * Get transactions grouped by category
 */
export async function getTransactionsByCategory(month?: string): Promise<
  Array<{ category: string; amount: number; kind: string }>
> {
  let query = supabase
    .from("transactions")
    .select("category, amount, kind")
    .not("category", "is", null);

  if (month) {
    const startDate = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().split("T")[0];
    query = query.gte("created_at", startDate).lt("created_at", endDateStr);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching transactions by category:", error);
    throw new Error("Failed to fetch category breakdown");
  }

  // Group by category
  const grouped = (data || []).reduce((acc, t) => {
    const existing = acc.find((item) => item.category === t.category);
    if (existing) {
      existing.amount += Number(t.amount);
    } else {
      acc.push({
        category: t.category || "อื่นๆ",
        amount: Number(t.amount),
        kind: t.kind,
      });
    }
    return acc;
  }, [] as Array<{ category: string; amount: number; kind: string }>);

  return grouped;
}
