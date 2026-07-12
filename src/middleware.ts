import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

// Node.js middleware runtime, needed for the crypto-based session check.
export const runtime = "nodejs";

// Publicly reachable without a session: the login page/API, the LINE
// webhook (verified separately via HMAC signature), and uptime/cron pings.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/line/webhook",
  "/api/health",
  "/api/cron/keep-alive",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
