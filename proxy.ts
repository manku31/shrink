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
  const isLanding = pathname === "/";
  const signedIn = await hasValidSession(request);

  // A valid cookie whose user no longer exists / was deactivated is sent here by lib/dal.ts.
  // Let them reach the login page instead of bouncing back to the dashboard in a loop.
  if (isAuthPage && request.nextUrl.searchParams.has("expired")) return NextResponse.next();

  if (!signedIn && !isAuthPage && !isLanding) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (signedIn && (isAuthPage || isLanding)) {
    // /dashboard sends admins on to /admin
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/dashboard/:path*", "/admin/:path*"],
};
