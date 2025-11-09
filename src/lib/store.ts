import { create } from "zustand";
import { DataBundle, Student, Schedule, Transaction, Category } from "@/types";

interface AppState {
  data: DataBundle;
  isHydrated: boolean;
  hydrationError: string | null;
  setData: (bundle: DataBundle) => void;
  markHydrated: () => void;
  setHydrationError: (err: string | null) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Start empty; we'll hydrate from Supabase on app load
  data: { students: [], schedules: [], transactions: [], categories: [] },
  isHydrated: false,
  hydrationError: null,
  setData: (bundle) => set(() => ({ data: bundle })),
  markHydrated: () => set(() => ({ isHydrated: true })),
  setHydrationError: (err) => set(() => ({ hydrationError: err })),
  
  addStudent: (student) =>
    set((state) => ({
      data: {
        ...state.data,
        students: [...state.data.students, student],
      },
    })),
    
  updateStudent: (id, updates) =>
    set((state) => ({
      data: {
        ...state.data,
        students: state.data.students.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
    })),
    
  deleteStudent: (id) =>
    set((state) => ({
      data: {
        ...state.data,
        students: state.data.students.filter((s) => s.id !== id),
      },
    })),
    
  addSchedule: (schedule) =>
    set((state) => ({
      data: {
        ...state.data,
        schedules: [...state.data.schedules, schedule],
      },
    })),
    
  updateSchedule: (id, updates) =>
    set((state) => ({
      data: {
        ...state.data,
        schedules: state.data.schedules.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
    })),
    
  deleteSchedule: (id) =>
    set((state) => ({
      data: {
        ...state.data,
        schedules: state.data.schedules.filter((s) => s.id !== id),
      },
    })),
    
  addTransaction: (transaction) =>
    set((state) => ({
      data: {
        ...state.data,
        transactions: [...state.data.transactions, transaction],
      },
    })),
    
  updateTransaction: (id, updates) =>
    set((state) => ({
      data: {
        ...state.data,
        transactions: state.data.transactions.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      },
    })),
    
  deleteTransaction: (id) =>
    set((state) => ({
      data: {
        ...state.data,
        transactions: state.data.transactions.filter((t) => t.id !== id),
      },
    })),
    
  addCategory: (category) =>
    set((state) => ({
      data: {
        ...state.data,
        categories: [...state.data.categories, category],
      },
    })),
    
  updateCategory: (id, updates) =>
    set((state) => ({
      data: {
        ...state.data,
        categories: state.data.categories.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      },
    })),
    
  deleteCategory: (id) =>
    set((state) => ({
      data: {
        ...state.data,
        categories: state.data.categories.filter((c) => c.id !== id),
      },
    })),
}));
