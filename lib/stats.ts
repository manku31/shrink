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

  const userLinks = await db
    .select({ id: links.id, name: links.name, slug: links.slug, targetUrl: links.targetUrl, clicks: links.clicks, createdAt: links.createdAt })
    .from(links)
    .where(and(eq(links.userId, userId), eq(links.isActive, true)))
    .orderBy(desc(links.createdAt));

  const ids = userLinks.map((l) => l.id);
  let series: DayPoint[] = fillDays([], days);
  if (ids.length) {
    const rows = await db
      .select({ day: dayExpr, n: sql<number>`count(*)::int` })
      .from(linkClicks)
      .where(and(inArray(linkClicks.linkId, ids), gte(linkClicks.clickedAt, since)))
      .groupBy(dayExpr);
    series = fillDays(rows, days);
  }

  const totalClicks = userLinks.reduce((n, l) => n + l.clicks, 0);
  const periodClicks = series.reduce((n, p) => n + p.clicks, 0);
  const topLinks = [...userLinks].sort((a, b) => b.clicks - a.clicks).filter((l) => l.clicks > 0).slice(0, 5);
  return { links: userLinks, series, totalClicks, periodClicks, topLinks, days };
}

export async function getLinkDetail(userId: string, linkId: string, days = 30) {
  // Not a UUID -> not found (avoids a Postgres cast error on bad URLs).
  if (!/^[0-9a-f-]{36}$/i.test(linkId)) return null;
  const db = getDb();
  const [link] = await db
    .select({ id: links.id, name: links.name, slug: links.slug, targetUrl: links.targetUrl, clicks: links.clicks, createdAt: links.createdAt })
    .from(links)
    .where(and(eq(links.id, linkId), eq(links.userId, userId), eq(links.isActive, true))) // owner only
    .limit(1);
  if (!link) return null;

  const since = new Date(Date.parse(isoDay(new Date())) - (days - 1) * DAY_MS);
  const [rows, recent] = await Promise.all([
    db
      .select({ day: dayExpr, n: sql<number>`count(*)::int` })
      .from(linkClicks)
      .where(and(eq(linkClicks.linkId, link.id), gte(linkClicks.clickedAt, since)))
      .groupBy(dayExpr),
    db
      .select({ at: linkClicks.clickedAt })
      .from(linkClicks)
      .where(eq(linkClicks.linkId, link.id))
      .orderBy(desc(linkClicks.clickedAt))
      .limit(10),
  ]);
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

  const [[match], [all]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(links).where(where),
    db
      .select({ n: sql<number>`count(*)::int`, clicks: sql<number>`coalesce(sum(${links.clicks}), 0)::int` })
      .from(links)
      .where(and(eq(links.userId, userId), eq(links.isActive, true))),
  ]);
  const pages = Math.max(1, Math.ceil(match.n / LINKS_PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page), pages);
  const rows = await db
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
    })
    .from(links)
    .where(where)
    .orderBy(...order)
    .limit(LINKS_PAGE_SIZE)
    .offset((page - 1) * LINKS_PAGE_SIZE);
  return { rows, matching: match.n, total: all.n, totalClicks: all.clicks, page, pages };
}
