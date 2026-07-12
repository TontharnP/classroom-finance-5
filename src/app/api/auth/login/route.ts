import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { badRequest, ok, serverError } from "@/lib/api/response";
import { createSessionToken, isCorrectPassword, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    const password = body?.password;

    if (!password || typeof password !== "string") {
      return badRequest("Password is required");
    }

    if (!isCorrectPassword(password)) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);

    return ok({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
