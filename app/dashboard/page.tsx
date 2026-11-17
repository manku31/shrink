import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getOrigin } from "@/lib/origin";
import { getOverview } from "@/lib/stats";
import { UserShell } from "../components/user-shell";
import { StatCard } from "../components/stat-card";
import { ClickChart } from "../components/click-chart";
import { NewLinkButton } from "../components/new-link-button";

// Auth redirects (not signed in / wrong role) must be real HTTP redirects, sent before
// any content streams. Opt out of instant-navigation validation for these gated pages.
export const instant = false;

export const metadata: Metadata = { title: "Overview – Shrink" };

export default async function DashboardPage() {
  const user = await requireUser(); // not signed in -> /login, admin -> /admin
  const { host, proto } = await getOrigin();
  const { links, series, totalClicks, periodClicks, topLinks, days } = await getOverview(user.id, 14);
  const best = topLinks[0];
  const maxTop = best?.clicks ?? 1;

  return (
    <UserShell user={user}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Hi {user.username}, here&apos;s how your links are doing.</p>
        </div>
        <NewLinkButton host={host} proto={proto} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total links" value={links.length} />
        <StatCard label="Total clicks" value={totalClicks} hint="All time" />
        <StatCard label={`Clicks, ${days} days`} value={periodClicks} />
        <StatCard label="Top link" value={best ? best.clicks : "–"} hint={best ? best.name || `${host}/${best.slug}` : "No clicks yet"} />
      </div>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:mt-6 sm:p-5">
        <h2 className="font-semibold">Clicks, last {days} days</h2>
        <div className="mt-3"><ClickChart data={series} label={`Clicks per day, last ${days} days`} /></div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <h2 className="font-semibold">Top links</h2>
          {topLinks.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Links will show up here once they get clicks.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {topLinks.map((l) => (
                <li key={l.id}>
                  <Link href={`/dashboard/links/${l.id}`} className="block">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-indigo-600 dark:text-indigo-400">{l.name || `${host}/${l.slug}`}</span>
                      <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">{l.clicks}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(4, (l.clicks / maxTop) * 100)}%` }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Recent links</h2>
            <Link href="/dashboard/links" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">View all</Link>
          </div>
          {links.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">You haven&apos;t created a link yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {links.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link href={`/dashboard/links/${l.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{l.name || `${host}/${l.slug}`}</span>
                      <span className="block truncate text-xs text-zinc-500">{l.targetUrl}</span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">{l.clicks}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </UserShell>
  );
}
