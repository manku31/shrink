import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { LINKS_PAGE_SIZE, type LinkFilter, type LinkSort } from "./link-options";

export type DayPoint = { date: string; clicks: number };

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** The last `days` calendar days (UTC), oldest first, ending today. */
function dayRange(days: number): string[] {
  const today = Date.parse(isoDay(new Date()));
  return Array.from({ length: days }, (_, i) => isoDay(new Date(today - (days - 1 - i) * DAY_MS)));
}

type DayRow = { day: string; n: number };

function fillDays(rows: DayRow[], days: number): DayPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r.n]));
  return dayRange(days).map((date) => ({ date, clicks: byDay.get(date) ?? 0 }));
}

const linkSelect = { id: true, name: true, slug: true, targetUrl: true, clicks: true, createdAt: true } as const;

export async function getOverview(userId: string, days = 14) {
  const since = new Date(Date.parse(isoDay(new Date())) - (days - 1) * DAY_MS);

  // One round trip: both queries run in parallel.
  const [userLinks, rows] = await Promise.all([
    prisma.link.findMany({
      where: { userId, isActive: true },
      select: linkSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.$queryRaw<DayRow[]>`
      select to_char(c.clicked_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as n
      from link_clicks c
      join links l on l.id = c.link_id
      where l.user_id = ${userId}::uuid and l.is_active and c.clicked_at >= ${since}
      group by 1`,
  ]);
  const series = fillDays(rows, days);

  const totalClicks = userLinks.reduce((n, l) => n + l.clicks, 0);
  const periodClicks = series.reduce((n, p) => n + p.clicks, 0);
  const topLinks = [...userLinks].sort((a, b) => b.clicks - a.clicks).filter((l) => l.clicks > 0).slice(0, 5);
  return { links: userLinks, series, totalClicks, periodClicks, topLinks, days };
}

export async function getLinkDetail(userId: string, linkId: string, days = 30) {
  // Not a UUID -> not found (avoids a Postgres cast error on bad URLs).
  if (!/^[0-9a-f-]{36}$/i.test(linkId)) return null;
  const since = new Date(Date.parse(isoDay(new Date())) - (days - 1) * DAY_MS);
  // All three queries in parallel (one round trip). Ownership is enforced by the first;
  // if it finds nothing, the click data is discarded.
  const [link, rows, recent] = await Promise.all([
    prisma.link.findFirst({
      where: { id: linkId, userId, isActive: true }, // owner only
      select: linkSelect,
    }),
    prisma.$queryRaw<DayRow[]>`
      select to_char(clicked_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as n
      from link_clicks
      where link_id = ${linkId}::uuid and clicked_at >= ${since}
      group by 1`,
    prisma.linkClick.findMany({
      where: { linkId },
      select: { clickedAt: true },
      orderBy: { clickedAt: "desc" },
      take: 10,
    }),
  ]);
  if (!link) return null;
  const series = fillDays(rows, days);
  return {
    link,
    series,
    days,
    last7: series.slice(-7).reduce((n, p) => n + p.clicks, 0),
    periodClicks: series.reduce((n, p) => n + p.clicks, 0),
    recent: recent.map((r) => r.clickedAt),
  };
}

/** Escape LIKE wildcards so user input is matched literally. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// Fixed list of ORDER BY clauses (never built from user input).
const ORDER_BY: Record<LinkSort, Prisma.Sql> = {
  newest: Prisma.sql`created_at desc`,
  oldest: Prisma.sql`created_at asc`,
  most: Prisma.sql`clicks desc, created_at desc`,
  least: Prisma.sql`clicks asc, created_at desc`,
  az: Prisma.sql`lower(coalesce(name, slug)) asc`,
};

type SearchRow = {
  id: string;
  name: string | null;
  slug: string;
  targetUrl: string;
  clicks: number;
  createdAt: Date;
  lastClickedAt: Date | null;
  matching: number;
};

export async function searchLinks(
  userId: string,
  opts: { q: string; sort: LinkSort; filter: LinkFilter; page: number },
) {
  const q = opts.q.trim().slice(0, 100);
  const pattern = `%${likeEscape(q)}%`;
  const conditions = [Prisma.sql`user_id = ${userId}::uuid`, Prisma.sql`is_active`];
  if (q) conditions.push(Prisma.sql`(name ilike ${pattern} or slug ilike ${pattern} or target_url ilike ${pattern})`);
  if (opts.filter === "clicked") conditions.push(Prisma.sql`clicks > 0`);
  if (opts.filter === "unclicked") conditions.push(Prisma.sql`clicks = 0`);
  const where = Prisma.join(conditions, " and ");
  const orderBy = ORDER_BY[opts.sort];
  const pageSize = LINKS_PAGE_SIZE;

  const fetchPage = (page: number) =>
    prisma.$queryRaw<SearchRow[]>`
      select id, name, slug, target_url as "targetUrl", clicks, created_at as "createdAt",
             (select max(clicked_at) from link_clicks where link_id = links.id) as "lastClickedAt",
             count(*) over ()::int as matching
      from links
      where ${where}
      order by ${orderBy}
      limit ${pageSize} offset ${(page - 1) * pageSize}`;
  const fetchTotals = () =>
    prisma.link.aggregate({
      where: { userId, isActive: true },
      _count: { _all: true },
      _sum: { clicks: true },
    });

  // One round trip: the page of rows (with the match count as a window total) and the overall totals in parallel.
  let page = Math.max(1, opts.page);
  const [firstRows, all] = await Promise.all([fetchPage(page), fetchTotals()]);
  let pageRows = firstRows;
  let matching = pageRows[0]?.matching ?? 0;
  // Asked for a page past the end: fall back to the last real page (rare, so the extra query is fine).
  if (pageRows.length === 0 && page > 1) {
    const lastPage = Math.max(1, Math.ceil(all._count._all / pageSize));
    page = Math.min(page, lastPage);
    pageRows = await fetchPage(page);
    matching = pageRows[0]?.matching ?? 0;
    if (pageRows.length === 0 && page > 1) {
      page = 1;
      pageRows = await fetchPage(1);
      matching = pageRows[0]?.matching ?? 0;
    }
  }
  const pages = Math.max(1, Math.ceil(matching / pageSize));
  const rows = pageRows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    targetUrl: r.targetUrl,
    clicks: r.clicks,
    createdAt: r.createdAt,
    lastClickedAt: r.lastClickedAt,
  }));
  return { rows, matching, total: all._count._all, totalClicks: all._sum.clicks ?? 0, page, pages };
}
