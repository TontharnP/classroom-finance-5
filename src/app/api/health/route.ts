import { pingSupabase } from "@/lib/supabase/keepAlive";

/**
 * Health check endpoint for cron services (Landed, UptimeRobot, etc.)
 * Keeps Supabase connection alive by pinging the database.
 */
export async function GET() {
  try {
    return Response.json(await pingSupabase());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown health check error";
    return Response.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
