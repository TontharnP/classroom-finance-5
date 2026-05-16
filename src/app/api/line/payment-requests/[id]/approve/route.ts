import { badRequest } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  await context.params;
  return badRequest("Approve payment requests from the treasurer LINE account.");
}
