import { cookies } from "next/headers";
import { ok, serverError } from "@/lib/api/response";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    return ok({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
