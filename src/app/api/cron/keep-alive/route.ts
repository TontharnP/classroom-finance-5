import { pingSupabase } from "@/lib/supabase/keepAlive";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await pingSupabase();
    return Response.json({
      ...result,
      purpose: "cron-keep-alive",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Supabase keep-alive error";
    return Response.json(
      {
        status: "error",
        service: "supabase",
        purpose: "cron-keep-alive",
        message,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
