import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserWith } from "@/lib/dal";
import { getOrigin } from "@/lib/origin";
import { getLinkDetail } from "@/lib/stats";
import { UserShell } from "../../../components/user-shell";
import { StatCard } from "../../../components/stat-card";
import { ClickChart } from "../../../components/click-chart";
import { CopyButton } from "../../../components/copy-button";
import { DeleteButton } from "../../../components/links-table";

export const instant = false;

export const metadata: Metadata = { title: "Link details – Shrink" };

export default async function LinkDetailPage({ params }: PageProps<"/dashboard/links/[id]">) {
  const { id } = await params;
  const [[user, detail], { host, proto }] = await Promise.all([
    requireUserWith((uid) => getLinkDetail(uid, id, 30)),
    getOrigin(),
  ]);
  if (!detail) notFound();
  const { link, series, days, last7, periodClicks, recent } = detail;
  const short = `${proto}://${host}/${link.slug}`;

  return (
    <UserShell user={user}>
      <Link href="/dashboard/links" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
        <span aria-hidden="true">←</span> All links
      </Link>

      <h1 className="mt-3 break-words text-2xl font-bold tracking-tight sm:text-3xl">{link.name || `${host}/${link.slug}`}</h1>
      {link.name && <p className="mt-1 break-all text-sm font-medium text-indigo-600 dark:text-indigo-400">{host}/{link.slug}</p>}
      <a
        href={link.targetUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-1.5 block break-all text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        {link.targetUrl}
      </a>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={short}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 md:py-1"
        >
          Open
        </a>
        <CopyButton text={short} />
        <DeleteButton id={link.id} redirectTo="/dashboard/links" variant="text" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total clicks" value={link.clicks} hint="All time" />
        <StatCard label="Last 7 days" value={last7} />
        <StatCard label={`Last ${days} days`} value={periodClicks} />
        <StatCard label="Created" value={link.createdAt.toISOString().slice(0, 10)} />
      </div>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:mt-6 sm:p-5">
        <h2 className="font-semibold">Clicks, last {days} days</h2>
        <div className="mt-3"><ClickChart data={series} label={`Clicks per day for ${link.slug}`} /></div>
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:mt-6 sm:p-5">
        <h2 className="font-semibold">Recent clicks</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No clicks recorded yet. Open the short link to try it.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {recent.map((at, i) => (
              <li key={`${i}-${at.toISOString()}`} className="py-2 text-zinc-600 tabular-nums dark:text-zinc-400">
                {at.toISOString().replace("T", " ").slice(0, 16)} UTC
              </li>
            ))}
          </ul>
        )}
      </section>
    </UserShell>
  );
}
