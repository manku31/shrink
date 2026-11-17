import "server-only";
import { and, asc, desc, eq, gt, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { linkClicks, links } from "@/db/schema";
import { LINKS_PAGE_SIZE, type LinkFilter, type LinkSort } from "./link-options";

export type DayPoint = { date: string; clicks: number };

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** The last `days` calendar days (UTC), oldest first, ending today. */
function dayRange(days: number): string[] {
  const today = Date.parse(isoDay(new Date()));
  return Array.from({ length: days }, (_, i) => isoDay(new Date(today - (days - 1 - i) * DAY_MS)));
}

function fillDays(rows: { day: string; n: number }[], days: number): DayPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r.n]));
  return dayRange(days).map((date) => ({ date, clicks: byDay.get(date) ?? 0 }));
}

const dayExpr = sql<string>`to_char(${linkClicks.clickedAt} at time zone 'UTC', 'YYYY-MM-DD')`;

export async function getOverview(userId: string, days = 14) {
  const db = getDb();
  const since = new Date(Date.parse(isoDay(new Date())) - (days - 1) * DAY_MS);

  // One round trip: both queries run in parallel (the click query uses a subselect, not the first result).
  const [userLinks, rows] = await Promise.all([
    db
      .select({ id: links.id, name: links.name, slug: links.slug, targetUrl: links.targetUrl, clicks: links.clicks, createdAt: links.createdAt })
      .from(links)
      .where(and(eq(links.userId, userId), eq(links.isActive, true)))
      .orderBy(desc(links.createdAt)),
    db
      .select({ day: dayExpr, n: sql<number>`count(*)::int` })
      .from(linkClicks)
      .where(
        and(
          inArray(linkClicks.linkId, db.select({ id: links.id }).from(links).where(and(eq(links.userId, userId), eq(links.isActive, true)))),
          gte(linkClicks.clickedAt, since),
        ),
      )
      .groupBy(dayExpr),
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
  const db = getDb();
  const since = new Date(Date.parse(isoDay(new Date())) - (days - 1) * DAY_MS);
  // All three queries in parallel (one round trip). Ownership is enforced by the first;
  // if it finds nothing, the click data is discarded.
  const [[link], rows, recent] = await Promise.all([
    db
      .select({ id: links.id, name: links.name, slug: links.slug, targetUrl: links.targetUrl, clicks: links.clicks, createdAt: links.createdAt })
      .from(links)
      .where(and(eq(links.id, linkId), eq(links.userId, userId), eq(links.isActive, true))) // owner only
      .limit(1),
    db
      .select({ day: dayExpr, n: sql<number>`count(*)::int` })
      .from(linkClicks)
      .where(and(eq(linkClicks.linkId, linkId), gte(linkClicks.clickedAt, since)))
      .groupBy(dayExpr),
    db
      .select({ at: linkClicks.clickedAt })
      .from(linkClicks)
      .where(eq(linkClicks.linkId, linkId))
      .orderBy(desc(linkClicks.clickedAt))
      .limit(10),
  ]);
  if (!link) return null;
  const series = fillDays(rows, days);
  return {
    link,
    series,
    days,
    last7: series.slice(-7).reduce((n, p) => n + p.clicks, 0),
    periodClicks: series.reduce((n, p) => n + p.clicks, 0),
    recent: recent.map((r) => r.at),
  };
}

/** Escape LIKE wildcards so user input is matched literally. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function searchLinks(
  userId: string,
  opts: { q: string; sort: LinkSort; filter: LinkFilter; page: number },
) {
  const db = getDb();
  const q = opts.q.trim().slice(0, 100);
  const pattern = `%${likeEscape(q)}%`;
  const where = and(
    eq(links.userId, userId),
    eq(links.isActive, true),
    q ? or(ilike(links.name, pattern), ilike(links.slug, pattern), ilike(links.targetUrl, pattern)) : undefined,
    opts.filter === "clicked" ? gt(links.clicks, 0) : opts.filter === "unclicked" ? eq(links.clicks, 0) : undefined,
  );
  const order = {
    newest: [desc(links.createdAt)],
    oldest: [asc(links.createdAt)],
    most: [desc(links.clicks), desc(links.createdAt)],
    least: [asc(links.clicks), desc(links.createdAt)],
    az: [asc(sql`lower(coalesce(${links.name}, ${links.slug}))`)],
  }[opts.sort];

  const pageSize = LINKS_PAGE_SIZE;
  const fetchPage = (page: number) =>
    db
      .select({
        id: links.id,
        name: links.name,
        slug: links.slug,
        targetUrl: links.targetUrl,
        clicks: links.clicks,
        createdAt: links.createdAt,
        lastClickedAt: sql<Date | null>`(select max(${linkClicks.clickedAt}) from ${linkClicks} where ${linkClicks.linkId} = ${links.id})`.mapWith(
          (v) => (v ? new Date(v) : null),
        ),
        matching: sql<number>`count(*) over ()::int`,
      })
      .from(links)
      .where(where)
      .orderBy(...order)
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  const fetchTotals = () =>
    db
      .select({ n: sql<number>`count(*)::int`, clicks: sql<number>`coalesce(sum(${links.clicks}), 0)::int` })
      .from(links)
      .where(and(eq(links.userId, userId), eq(links.isActive, true)));

  // One round trip: the page of rows (with the match count as a window total) and the overall totals in parallel.
  let page = Math.max(1, opts.page);
  const [firstRows, [all]] = await Promise.all([fetchPage(page), fetchTotals()]);
  let pageRows = firstRows;
  let matching = pageRows[0]?.matching ?? 0;
  // Asked for a page past the end: fall back to the last real page (rare, so the extra query is fine).
  if (pageRows.length === 0 && page > 1) {
    const lastPage = Math.max(1, Math.ceil(all.n / pageSize));
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
  const rows = pageRows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, targetUrl: r.targetUrl, clicks: r.clicks, createdAt: r.createdAt, lastClickedAt: r.lastClickedAt }));
  return { rows, matching, total: all.n, totalClicks: all.clicks, page, pages };
}
