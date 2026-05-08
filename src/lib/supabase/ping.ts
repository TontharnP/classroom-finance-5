import { apiRequest } from "@/lib/api/client";

export interface DatabasePingResult {
  ok: boolean;
  error?: string;
}

export async function supabasePing(): Promise<DatabasePingResult> {
  try {
    await apiRequest("/api/students");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Database ping failed",
    };
  }
}

