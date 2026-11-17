import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Optimistic checks only (cookie signature + expiry, no DB lookup).
// The real authorization (user exists, role) happens in the pages via lib/dal.ts.
async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const signedIn = await hasValidSession(request);

  if (!signedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (signedIn && isAuthPage) {
    // /dashboard sends admins on to /admin
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/dashboard/:path*", "/admin/:path*"],
};
