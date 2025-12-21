import { supabase } from "../supabaseClient";
import type { Schedule, ScheduleInput, ScheduleUpdate } from "@/types/supabase";

/**
 * Fetch all schedules ordered by start date (newest first)
 */
export async function getSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching schedules:", error);
    throw new Error(`Failed to fetch schedules: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single schedule by ID
 */
export async function getScheduleById(id: string): Promise<Schedule | null> {
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Error fetching schedule:", error);
    throw new Error(`Failed to fetch schedule: ${error.message}`);
  }

  return data;
}

/**
 * Fetch active schedules (not yet ended)
 */
export async function getActiveSchedules(): Promise<Schedule[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching active schedules:", error);
    throw new Error(`Failed to fetch active schedules: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new schedule
 */
export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      name: input.name,
      amount_per_item: input.amount_per_item,
      start_date: input.start_date,
      end_date: input.end_date,
      description: input.description,
      student_ids: input.student_ids,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating schedule:", error);
    throw new Error(`Failed to create schedule: ${error.message}`);
  }

  return data;
}

/**
 * Update a schedule
 */
export async function updateSchedule(id: string, updates: ScheduleUpdate): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating schedule:", error);
    throw new Error(`Failed to update schedule: ${error.message}`);
  }

  return data;
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting schedule:", error);
    throw new Error(`Failed to delete schedule: ${error.message}`);
  }
}

/**
 * Get students who paid for a specific schedule
 */
export async function getStudentsPaidForSchedule(scheduleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("student_id")
    .eq("schedule_id", scheduleId)
    .eq("source", "schedule");

  if (error) {
    console.error("Error fetching paid students:", error);
    throw new Error(`Failed to fetch paid students: ${error.message}`);
  }

  return data.map((t) => t.student_id).filter((id): id is string => id !== null);
}

/**
 * Get payment status for a schedule
 */
export async function getSchedulePaymentStatus(scheduleId: string): Promise<{
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalCollected: number;
  targetAmount: number;
}> {
  // Get schedule details
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) {
    throw new Error("Schedule not found");
  }

  // Get paid students
  const paidStudentIds = await getStudentsPaidForSchedule(scheduleId);

  const totalStudents = schedule.student_ids.length;
  const paidStudents = paidStudentIds.length;
  const unpaidStudents = totalStudents - paidStudents;
  const totalCollected = paidStudents * schedule.amount_per_item;
  const targetAmount = totalStudents * schedule.amount_per_item;

  return {
    totalStudents,
    paidStudents,
    unpaidStudents,
    totalCollected,
    targetAmount,
  };
}
