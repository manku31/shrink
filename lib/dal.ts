import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSessionUserId } from "./session";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
};

// Current user from the DB (never exposes password_hash). Memoized per request.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: { id: true, username: true, email: true, role: true },
  });
});

export function homePathFor(role: SessionUser["role"]) {
  return role === "admin" ? "/admin" : "/dashboard";
}

/** For the normal user dashboard. Admins are sent to the admin dashboard. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");
  if (user.role === "admin") redirect("/admin");
  return user;
}

/**
 * requireUser() + page data in one round trip. The session cookie already carries the user id,
 * so the page queries start immediately instead of waiting for the user lookup.
 * Auth is still enforced by requireUser(); if it redirects, the early result is discarded.
 */
export async function requireUserWith<T>(load: (userId: string) => Promise<T>): Promise<[SessionUser, T]> {
  const sid = await getSessionUserId();
  const early = sid ? load(sid).then((value) => ({ value }), () => null) : null;
  const user = await requireUser();
  const hit = early ? await early : null;
  return [user, hit ? hit.value : await load(user.id)];
}

/** For admin-only pages. Normal users are sent to their own dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
