"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueViolation } from "@/lib/prisma-errors";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { homePathFor } from "@/lib/dal";
import { clearKeys, clientIp, isLimited, recordFailure } from "@/lib/rate-limit";

export type AuthState =
  | {
      errors?: Partial<
        Record<"username" | "email" | "password" | "form", string>
      >;
      values?: { username?: string; email?: string };
    }
  | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { username, email };
  const errors: NonNullable<AuthState>["errors"] = {};

  if (!USERNAME_RE.test(username))
    errors.username = "3–30 characters: letters, numbers and underscores only.";
  if (!EMAIL_RE.test(email) || email.length > 254)
    errors.email = "Enter a valid email address.";
  if (password.length < 8)
    errors.password = "Password must be at least 8 characters.";
  else if (password.length > 128)
    errors.password = "Password must be at most 128 characters.";
  if (Object.keys(errors).length) return { errors, values };

  let userId: string;
  try {
    // NOTE: `role` is deliberately not set: the DB default ('user') always applies.
    // Nothing from the form can ever create an admin.
    const created = await prisma.user.create({
      data: { username, email, passwordHash: await hashPassword(password) },
      select: { id: true },
    });
    userId = created.id;
  } catch (err) {
    const constraint = uniqueViolation(err);
    if (constraint) {
      return {
        errors:
          constraint === "users_username_lower_idx"
            ? { username: "That username is taken." }
            : { email: "An account with this email already exists." },
        values,
      };
    }
    console.error("Signup failed:", err);
    return {
      errors: { form: "Something went wrong. Please try again." },
      values,
    };
  }

  await createSession(userId);
  redirect("/dashboard"); // new accounts are always normal users
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { email };

  if (!email || !password) {
    return { errors: { form: "Enter your email and password." }, values };
  }

  // Rate limiting (failed attempts only, 15-minute window):
  //  - 5 per IP + email pair, so an attacker can't lock a victim out from their own IP
  //  - 20 per IP overall, to stop one machine trying many accounts
  const ip = await clientIp();
  const pairKey = `rl:login:pair:${ip}:${email}`;
  const ipKey = `rl:login:ip:${ip}`;
  if (
    await isLimited([
      { key: pairKey, limit: 5 },
      { key: ipKey, limit: 20 },
    ])
  ) {
    return {
      errors: { form: "Too many attempts. Try again in 15 minutes." },
      values,
    };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } }, // emails are unique ignoring case
    select: { id: true, role: true, passwordHash: true, isActive: true },
  });

  // Always run a hash comparison so timing doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) {
    await recordFailure([pairKey, ipKey]);
    return { errors: { form: "Invalid email or password." }, values };
  }

  // Successful login: forgive this IP + email pair (the IP-wide counter keeps running).
  await clearKeys([pairKey]);

  await createSession(user.id);
  redirect(homePathFor(user.role)); // admin -> /admin, user -> /dashboard
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
