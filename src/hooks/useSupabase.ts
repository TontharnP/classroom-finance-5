import useSWR from "swr";
import type { Student, Schedule, Transaction } from "@/types/supabase";
import * as supabaseApi from "@/lib/supabase";

/**
 * Hook to fetch all students
 */
export function useStudents() {
  const { data, error, isLoading, mutate } = useSWR<Student[]>(
    "students",
    supabaseApi.getStudents
  );

  return {
    students: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch a single student by ID
 */
export function useStudent(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Student | null>(
    id ? `student-${id}` : null,
    () => (id ? supabaseApi.getStudentById(id) : null)
  );

  return {
    student: data,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch all schedules
 */
export function useSchedules() {
  const { data, error, isLoading, mutate } = useSWR<Schedule[]>(
    "schedules",
    supabaseApi.getSchedules
  );

  return {
    schedules: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch active schedules only
 */
export function useActiveSchedules() {
  const { data, error, isLoading, mutate } = useSWR<Schedule[]>(
    "schedules-active",
    supabaseApi.getActiveSchedules
  );

  return {
    schedules: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch a single schedule by ID
 */
export function useSchedule(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Schedule | null>(
    id ? `schedule-${id}` : null,
    () => (id ? supabaseApi.getScheduleById(id) : null)
  );

  return {
    schedule: data,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch all transactions
 */
export function useTransactions() {
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    "transactions",
    supabaseApi.getTransactions
  );

  return {
    transactions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch transactions by kind
 */
export function useTransactionsByKind(kind: "income" | "expense" | null) {
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    kind ? `transactions-kind-${kind}` : null,
    kind ? () => supabaseApi.getTransactionsByKind(kind) : null
  );

  return {
    transactions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch transactions by source
 */
export function useTransactionsBySource(source: "transaction" | "schedule" | null) {
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    source ? `transactions-source-${source}` : null,
    source ? () => supabaseApi.getTransactionsBySource(source) : null
  );

  return {
    transactions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch transactions for a schedule
 */
export function useTransactionsBySchedule(scheduleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    scheduleId ? `transactions-schedule-${scheduleId}` : null,
    scheduleId ? () => supabaseApi.getTransactionsBySchedule(scheduleId) : null
  );

  return {
    transactions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch transactions for a student
 */
export function useTransactionsByStudent(studentId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    studentId ? `transactions-student-${studentId}` : null,
    studentId ? () => supabaseApi.getTransactionsByStudent(studentId) : null
  );

  return {
    transactions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch transactions by month
 */
export function useTransactionsByMonth(month: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    month ? `transactions-month-${month}` : null,
    month ? () => supabaseApi.getTransactionsByMonth(month) : null
  );

  return {
    transactions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch total balance
 */
export function useTotalBalance() {
  const { data, error, isLoading, mutate } = useSWR(
    "balance",
    supabaseApi.getTotalBalance
  );

  return {
    balance: data || { income: 0, expense: 0, balance: 0 },
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch income breakdown by method
 */
export function useIncomeByMethod() {
  const { data, error, isLoading, mutate } = useSWR(
    "income-by-method",
    supabaseApi.getIncomeByMethod
  );

  return {
    incomeBreakdown: data || { kplus: 0, cash: 0, truemoney: 0, total: 0 },
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch schedule payment status
 */
export function useSchedulePaymentStatus(scheduleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    scheduleId ? `schedule-status-${scheduleId}` : null,
    () => (scheduleId ? supabaseApi.getSchedulePaymentStatus(scheduleId) : null)
  );

  return {
    status: data || {
      totalStudents: 0,
      paidStudents: 0,
      unpaidStudents: 0,
      totalCollected: 0,
      targetAmount: 0,
    },
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch transactions grouped by category
 */
export function useTransactionsByCategory(month?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    month ? `transactions-category-${month}` : "transactions-category",
    () => supabaseApi.getTransactionsByCategory(month)
  );

  return {
    categories: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Utility to revalidate all related data
 */
export function useRevalidateAll() {
  const { mutate: mutateStudents } = useStudents();
  const { mutate: mutateSchedules } = useSchedules();
  const { mutate: mutateTransactions } = useTransactions();
  const { mutate: mutateBalance } = useTotalBalance();
  const { mutate: mutateIncome } = useIncomeByMethod();

  return async () => {
    await Promise.all([
      mutateStudents(),
      mutateSchedules(),
      mutateTransactions(),
      mutateBalance(),
      mutateIncome(),
    ]);
  };
}
