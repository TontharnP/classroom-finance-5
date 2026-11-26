import { mutateAdditionalCostRound } from "@/lib/server/additionalCosts";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  return mutateAdditionalCostRound("update", id, body?.percentage);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  return mutateAdditionalCostRound("delete", id);
}
