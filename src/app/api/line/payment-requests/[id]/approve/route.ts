import { ok, serverError } from "@/lib/api/response";
import { approveLinePaymentRequest } from "@/lib/server/linePaymentReview";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await approveLinePaymentRequest({
      requestId: id,
      reviewerLineUserId: "web",
    }));
  } catch (error) {
    return serverError(error);
  }
}
