import { apiRequest } from "@/lib/api/client";
import type { Transaction, TransactionInput, TransactionUpdate } from "@/types/supabase";

export async function getTransactions(): Promise<Transaction[]> {
  return apiRequest<Transaction[]>("/api/transactions");
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  try {
    return await apiRequest<Transaction>(`/api/transactions/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) return null;
    throw error;
  }
}

export async function getTransactionsByKind(kind: "income" | "expense"): Promise<Transaction[]> {
  return apiRequest<Transaction[]>(`/api/transactions?kind=${kind}`);
}

export async function getTransactionsBySource(source: "transaction" | "schedule"): Promise<Transaction[]> {
  return apiRequest<Transaction[]>(`/api/transactions?source=${source}`);
}

export async function getTransactionsBySchedule(scheduleId: string): Promise<Transaction[]> {
  return apiRequest<Transaction[]>(`/api/transactions?scheduleId=${encodeURIComponent(scheduleId)}`);
}

export async function getTransactionsByStudent(studentId: string): Promise<Transaction[]> {
  return apiRequest<Transaction[]>(`/api/transactions?studentId=${encodeURIComponent(studentId)}`);
}

export async function getTransactionsByMonth(month: string): Promise<Transaction[]> {
  return apiRequest<Transaction[]>(`/api/transactions?month=${encodeURIComponent(month)}`);
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  return apiRequest<Transaction>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createTransactions(inputs: TransactionInput[]): Promise<Transaction[]> {
  return apiRequest<Transaction[]>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
}

export async function updateTransaction(id: string, updates: TransactionUpdate): Promise<Transaction> {
  return apiRequest<Transaction>(`/api/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return apiRequest<void>(`/api/transactions/${id}`, {
    method: "DELETE",
  });
}

export async function getTotalBalance(): Promise<{
  income: number;
  expense: number;
  balance: number;
}> {
  return apiRequest("/api/transactions/balance");
}

export async function getIncomeByMethod(): Promise<{
  kplus: number;
  cash: number;
  truemoney: number;
  total: number;
}> {
  return apiRequest("/api/transactions/income-by-method");
}

export async function getTransactionsByCategory(month?: string): Promise<
  Array<{ category: string; amount: number; kind: string }>
> {
  const params = new URLSearchParams({ summary: "category" });
  if (month) params.set("month", month);
  return apiRequest(`/api/transactions?${params.toString()}`);
}

