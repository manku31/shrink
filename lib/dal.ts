import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { getSessionUserId } from "./session";
import { users } from "@/db/schema";

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
  const [user] = await getDb()
    .select({ id: users.id, username: users.username, email: users.email, role: users.role })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);
  return user ?? null;
});

export function homePathFor(role: SessionUser["role"]) {
  return role === "admin" ? "/admin" : "/dashboard";
}

/** For the normal user dashboard. Admins are sent to the admin dashboard. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  return user;
}

/** For admin-only pages. Normal users are sent to their own dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
