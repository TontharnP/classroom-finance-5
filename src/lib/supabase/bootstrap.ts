import { apiRequest } from "@/lib/api/client";
import type {
  AdditionalCostItem,
  AdditionalCostRun,
  Schedule,
  ScheduleFolder,
  Student,
  Transaction,
} from "@/types/supabase";
import type { Category } from "@/types/supabase-category";
import type { BootstrapResource } from "@/lib/bootstrap";

export type BootstrapData = {
  resources: BootstrapResource[];
  students?: Student[];
  schedules?: Schedule[];
  scheduleFolders?: ScheduleFolder[];
  transactions?: Transaction[];
  categories?: Category[];
  additionalCostRuns?: AdditionalCostRun[];
  additionalCostItems?: AdditionalCostItem[];
};

export function getBootstrapData(resources: BootstrapResource[]): Promise<BootstrapData> {
  const params = new URLSearchParams({ resources: resources.join(",") });
  return apiRequest<BootstrapData>(`/api/bootstrap?${params.toString()}`);
}
