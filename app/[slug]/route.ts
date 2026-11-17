import { after, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { linkClicks, links, users } from "@/db/schema";
import { RESERVED_SLUGS, SLUG_RE } from "@/lib/links";

// Public short-link redirect: GET /{slug} -> target URL (counts the click).
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return new NextResponse("Not found", { status: 404 });
  }
  const [link] = await getDb()
    .update(links)
    .set({ clicks: sql`${links.clicks} + 1` })
    .where(
      sql`${links.slug} = ${slug} and ${links.isActive} and exists (select 1 from ${users} where ${users.id} = ${links.userId} and ${users.isActive})`,
    )
    .returning({ id: links.id, targetUrl: links.targetUrl });
  if (!link) return new NextResponse("Short link not found", { status: 404 });
  // Record the click for analytics after the redirect is sent, so it adds no latency.
  // Never let a logging failure break the redirect.
  after(async () => {
    try {
      await getDb().insert(linkClicks).values({ linkId: link.id });
    } catch (err) {
      console.error("Click log failed:", err);
    }
  });
  // 307 (temporary) so browsers don't cache it and skip click counting.
  return NextResponse.redirect(link.targetUrl, 307);
}
