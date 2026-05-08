import { apiRequest } from "@/lib/api/client";
import type { ScheduleFolder, ScheduleFolderInput, ScheduleFolderUpdate } from "@/types/supabase";

export async function getScheduleFolders(): Promise<ScheduleFolder[]> {
  return apiRequest<ScheduleFolder[]>("/api/schedule-folders");
}

export async function createScheduleFolder(input: ScheduleFolderInput): Promise<ScheduleFolder> {
  return apiRequest<ScheduleFolder>("/api/schedule-folders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateScheduleFolder(
  id: string,
  updates: ScheduleFolderUpdate & { parent_id?: string | null }
): Promise<ScheduleFolder> {
  return apiRequest<ScheduleFolder>(`/api/schedule-folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteScheduleFolder(id: string): Promise<void> {
  return apiRequest<void>(`/api/schedule-folders/${id}`, {
    method: "DELETE",
  });
}

