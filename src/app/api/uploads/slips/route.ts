import { badRequest, notFound, serverError } from "@/lib/api/response";
import { downloadSlipImage } from "@/lib/server/slipStorage";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pathname = url.searchParams.get("path");
    if (!pathname) return badRequest("path is required");

    const file = await downloadSlipImage(pathname);
    if (!file) return notFound("Slip not found");

    return new Response(file.stream(), {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": file.type || "image/jpeg",
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
