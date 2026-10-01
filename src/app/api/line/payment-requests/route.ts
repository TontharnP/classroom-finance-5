import { ok, serverError } from "@/lib/api/response";
import { getSupabaseAdmin, type Row } from "@/lib/supabase/server";
import { mapLinePaymentRequest } from "@/lib/supabase/mappers";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scheduleId = url.searchParams.get("scheduleId");
    const status = url.searchParams.get("status");
    let query = getSupabaseAdmin().from("line_payment_requests").select("*");
    if (scheduleId) query = query.eq("schedule_id", scheduleId);
    if (status) {
      const statuses = status.split(",").map((item) => item.trim()).filter(Boolean);
      if (statuses.length > 0) query = query.in("status", statuses);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    return ok(rows.map(mapLinePaymentRequest));
  } catch (error) {
    return serverError(error);
  }
}
