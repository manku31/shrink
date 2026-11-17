import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getOrigin } from "@/lib/origin";
import { searchLinks } from "@/lib/stats";
import { LINK_FILTERS, LINK_SORTS, type LinkFilter, type LinkSort } from "@/lib/link-options";
import { UserShell } from "../../components/user-shell";
import { NewLinkButton } from "../../components/new-link-button";
import { LinksTable } from "../../components/links-table";
import { LinksToolbar } from "../../components/links-toolbar";

export const instant = false;

export const metadata: Metadata = { title: "Links – Shrink" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function LinksPage({ searchParams }: PageProps<"/dashboard/links">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = first(sp.q).slice(0, 100);
  const sort = (LINK_SORTS.some((o) => o.value === first(sp.sort)) ? first(sp.sort) : "newest") as LinkSort;
  const filter = (LINK_FILTERS.some((o) => o.value === first(sp.filter)) ? first(sp.filter) : "all") as LinkFilter;
  const page = Math.max(1, parseInt(first(sp.page), 10) || 1);

  const { rows, matching, total, totalClicks, page: current, pages } = await searchLinks(user.id, { q, sort, filter, page });
  const { host, proto } = await getOrigin();
  const filtered = Boolean(q.trim()) || filter !== "all";

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter !== "all") params.set("filter", filter);
    if (sort !== "newest") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/dashboard/links?${qs}` : "/dashboard/links";
  };

  return (
    <UserShell user={user}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your links</h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            {total} {total === 1 ? "link" : "links"} · {totalClicks} total {totalClicks === 1 ? "click" : "clicks"}
          </p>
        </div>
        <NewLinkButton host={host} proto={proto} />
      </div>

      <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
        {total > 0 && <LinksToolbar q={q} sort={sort} filter={filter} />}

        {total > 0 && filtered && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
            Showing {matching} of {total} {total === 1 ? "link" : "links"}
          </p>
        )}

        {matching === 0 && total > 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 sm:p-10">
            No links match your search.
          </div>
        ) : (
          <LinksTable rows={rows} host={host} proto={proto} detailHref={(id) => `/dashboard/links/${id}`} editHref={(id) => `/dashboard/links/${id}/edit`} />
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
            {current > 1 ? (
              <Link href={pageHref(current - 1)} className="rounded-lg border border-zinc-300 px-4 py-2.5 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">← Previous</Link>
            ) : <span />}
            <span className="text-zinc-600 dark:text-zinc-400">Page {current} of {pages}</span>
            {current < pages ? (
              <Link href={pageHref(current + 1)} className="rounded-lg border border-zinc-300 px-4 py-2.5 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Next →</Link>
            ) : <span />}
          </nav>
        )}
      </div>
    </UserShell>
  );
}
