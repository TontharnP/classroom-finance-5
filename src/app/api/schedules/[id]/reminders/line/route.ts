import { badRequest, notFound, ok, serverError } from "@/lib/api/response";
import { sendScheduleLineNotices } from "@/lib/server/lineScheduleMessages";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { studentIds?: string[]; kind?: "announcement" | "reminder" };
    const kind = body.kind === "announcement" ? "announcement" : "reminder";
    const result = await sendScheduleLineNotices({
      scheduleId: id,
      studentIds: body.studentIds,
      kind,
    });
    if (!result) return notFound("Schedule not found");
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Missing LINE_CHANNEL_ACCESS_TOKEN") {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}
