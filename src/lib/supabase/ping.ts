import { supabase } from "../supabaseClient";

export interface SupabasePingResult {
  ok: boolean;
  error?: string;
  studentsCount?: number;
  storageOk?: boolean;
}

// Performs lightweight connectivity checks:
// 1. Head count query on students (minimal payload)
// 2. Attempt to list 1 file from avatars bucket (to verify bucket exists/public)
export async function supabasePing(): Promise<SupabasePingResult> {
  const result: SupabasePingResult = { ok: false };
  try {
    const { count, error } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true });
    if (error) {
      result.error = `students head error: ${error.message}`;
    } else {
      result.studentsCount = count ?? 0;
    }
  } catch (e: any) {
    result.error = `fetch failed: ${e.message}`;
  }

  // Storage check (best-effort)
  try {
    const { data, error } = await supabase.storage.from("avatars").list(undefined, { limit: 1 });
    if (!error) {
      result.storageOk = true;
    } else {
      if (result.error) {
        result.error += ` | storage: ${error.message}`;
      } else {
        result.error = `storage: ${error.message}`;
      }
    }
  } catch (e: any) {
    if (result.error) {
      result.error += ` | storage fetch failed: ${e.message}`;
    } else {
      result.error = `storage fetch failed: ${e.message}`;
    }
  }

  result.ok = !result.error;
  return result;
}
