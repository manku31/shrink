import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RESERVED_SLUGS, SLUG_RE } from "@/lib/links";

// Public short-link redirect: GET /{slug} -> target URL (counts the click).
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return new NextResponse("Not found", { status: 404 });
  }
  // One query: count the click and fetch the target, but only for an active link with an active owner.
  const [link] = await prisma.$queryRaw<{ id: string; targetUrl: string }[]>`
    update links set clicks = clicks + 1
    where slug = ${slug} and is_active
      and exists (select 1 from users where users.id = links.user_id and users.is_active)
    returning id, target_url as "targetUrl"`;
  if (!link) return new NextResponse("Short link not found", { status: 404 });
  // Record the click for analytics after the redirect is sent, so it adds no latency.
  // Never let a logging failure break the redirect.
  after(async () => {
    try {
      await prisma.linkClick.create({ data: { linkId: link.id } });
    } catch (err) {
      console.error("Click log failed:", err);
    }
  });
  // 307 (temporary) so browsers don't cache it and skip click counting.
  return NextResponse.redirect(link.targetUrl, 307);
}
