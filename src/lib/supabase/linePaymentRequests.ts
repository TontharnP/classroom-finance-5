import { apiRequest } from "@/lib/api/client";
import type { LinePaymentRequest, LinePaymentRequestUpdate } from "@/types/supabase";

export async function getLinePaymentRequests(params?: {
  scheduleId?: string;
  status?: string;
}): Promise<LinePaymentRequest[]> {
  const search = new URLSearchParams();
  if (params?.scheduleId) search.set("scheduleId", params.scheduleId);
  if (params?.status) search.set("status", params.status);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiRequest<LinePaymentRequest[]>(`/api/line/payment-requests${suffix}`);
}

export async function updateLinePaymentRequest(
  id: string,
  updates: LinePaymentRequestUpdate
): Promise<LinePaymentRequest> {
  return apiRequest<LinePaymentRequest>(`/api/line/payment-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function approveLinePaymentRequest(id: string): Promise<{
  request: LinePaymentRequest;
  transactions: import("@/types/supabase").Transaction[];
}> {
  return apiRequest(`/api/line/payment-requests/${id}/approve`, {
    method: "POST",
  });
}
