import { apiRequest } from "@/lib/api/client";
import type { Schedule, ScheduleInput, ScheduleUpdate } from "@/types/supabase";

export async function getSchedules(): Promise<Schedule[]> {
  return apiRequest<Schedule[]>("/api/schedules");
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  try {
    return await apiRequest<Schedule>(`/api/schedules/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) return null;
    throw error;
  }
}

export async function getActiveSchedules(): Promise<Schedule[]> {
  return apiRequest<Schedule[]>("/api/schedules?active=true");
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  return apiRequest<Schedule>("/api/schedules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSchedule(id: string, updates: ScheduleUpdate): Promise<Schedule> {
  return apiRequest<Schedule>(`/api/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  return apiRequest<void>(`/api/schedules/${id}`, {
    method: "DELETE",
  });
}

export async function getStudentsPaidForSchedule(scheduleId: string): Promise<string[]> {
  const transactions = await apiRequest<Array<{ student_id?: string }>>(
    `/api/transactions?scheduleId=${encodeURIComponent(scheduleId)}&source=schedule`
  );
  return transactions.map((transaction) => transaction.student_id).filter((id): id is string => Boolean(id));
}

export async function getSchedulePaymentStatus(scheduleId: string): Promise<{
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalCollected: number;
  targetAmount: number;
}> {
  return apiRequest(`/api/schedules/${scheduleId}/status`);
}

