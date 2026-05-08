import "server-only";

import { getSupabaseAdmin, isMissingTableError } from "./server";

const PING_TABLE = "students";

export type SupabaseKeepAliveResult = {
  status: "ok";
  service: "supabase";
  table: string;
  checkedAt: string;
  message?: string;
};

export async function pingSupabase(): Promise<SupabaseKeepAliveResult> {
  const checkedAt = new Date().toISOString();
  const { error } = await getSupabaseAdmin()
    .from(PING_TABLE)
    .select("id", { count: "exact", head: true });

  if (error) {
    if (isMissingTableError(error, PING_TABLE) || error.code === "42P01") {
      return {
        status: "ok",
        service: "supabase",
        table: PING_TABLE,
        checkedAt,
        message: "Supabase connection healthy; ping table is not available yet.",
      };
    }

    throw error;
  }

  return {
    status: "ok",
    service: "supabase",
    table: PING_TABLE,
    checkedAt,
  };
}
