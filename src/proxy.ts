/**
 * Route protection (runs before every matched request).
 *
 * This is the quick, optimistic check: it only reads the signed session
 * cookie, never the database, so it stays fast. The real check happens in
 * src/lib/auth/dal.ts (requireAdmin / requireUser), which every protected
 * page and Server Action calls.
 *
 *   /admin/...   -> must be signed in as ADMIN
 *   /faculty/... -> must be signed in (any role)
 *   /login       -> signed-in users are sent to their home page
 */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, homeFor, readSessionToken } from "@/lib/auth/session-token";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  const toLogin = () => {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin")) {
    if (!session) return toLogin();
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL(homeFor(session.role), request.url));
    }
  }

  if (pathname.startsWith("/faculty") && !session) {
    return toLogin();
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/faculty/:path*", "/login"],
};
