import { apiRequest } from "@/lib/api/client";
import type { AdditionalCostItem, AdditionalCostRun } from "@/types/supabase";

export type AdditionalCostsResponse = {
  runs: AdditionalCostRun[];
  items: AdditionalCostItem[];
};

export type ApplyAdditionalCostResponse = {
  run: AdditionalCostRun;
  items: AdditionalCostItem[];
};

export async function getAdditionalCosts(): Promise<AdditionalCostsResponse> {
  return apiRequest<AdditionalCostsResponse>("/api/additional-costs");
}

export async function applyAdditionalCost(percentage: number, requestKey: string) {
  return apiRequest<ApplyAdditionalCostResponse>("/api/additional-costs", {
    method: "POST",
    body: JSON.stringify({ percentage, requestKey }),
  });
}
