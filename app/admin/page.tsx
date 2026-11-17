import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { links, users } from "@/db/schema";
import { DashboardShell } from "../components/dashboard-shell";
import { deactivateUser } from "../actions/users";
import { LinksTable } from "../components/links-table";

// Auth redirects (not signed in / wrong role) must be real HTTP redirects, sent before
// any content streams. Opt out of instant-navigation validation for these gated pages.
export const instant = false;

export const metadata: Metadata = { title: "Admin – Shrink" };

export default async function AdminPage() {
  await connection(); // request-time page: opt out of prerendering before touching the DB
  // Auth check and both queries run in parallel (one round trip instead of three).
  // Never select password_hash.
  const [admin, allUsers, allLinks] = await Promise.all([
    requireAdmin(), // not signed in -> /login, normal user -> /dashboard
    getDb()
      .select({ id: users.id, username: users.username, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(desc(users.createdAt)),
    getDb()
      .select({ id: links.id, name: links.name, slug: links.slug, targetUrl: links.targetUrl, clicks: links.clicks, createdAt: links.createdAt, owner: users.username })
      .from(links)
      .innerJoin(users, eq(links.userId, users.id))
      .where(and(eq(links.isActive, true), eq(users.isActive, true)))
      .orderBy(desc(links.createdAt)),
  ]);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <DashboardShell user={admin}>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin dashboard</h1>
      <p className="mt-1.5 text-sm text-zinc-600 sm:mt-2 sm:text-base dark:text-zinc-400">
        {allUsers.length} registered {allUsers.length === 1 ? "user" : "users"} · {allLinks.length}{" "}
        {allLinks.length === 1 ? "short link" : "short links"}.
      </p>
      <h2 className="mt-6 text-lg font-semibold sm:mt-8 sm:text-xl">All links</h2>
      <div className="mt-4"><LinksTable rows={allLinks} host={host} proto={proto} /></div>
      <h2 className="mt-8 text-lg font-semibold sm:mt-10 sm:text-xl">Users</h2>
      <ul className="mt-4 space-y-3 md:hidden">
        {allUsers.map((u) => (
          <li key={u.id} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-medium">{u.username}</span>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{u.role}</span>
            </div>
            <p className="mt-1 break-all text-sm text-zinc-600 dark:text-zinc-400">{u.email}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">Joined {u.createdAt.toISOString().slice(0, 10)}</p>
              {u.id !== admin.id && <form action={deactivateUser}>
    <input type="hidden" name="id" value={u.id} />
    <button type="submit" className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Delete</button>
  </form>}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {allUsers.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.createdAt.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">{u.id !== admin.id && <form action={deactivateUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Delete</button>
                  </form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
