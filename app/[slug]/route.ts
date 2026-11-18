import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { RESERVED_SLUGS, SLUG_RE } from "@/lib/links";

type Target = { id: string; url: string } | null; // null = "no such link"

const TTL = 60 * 60; // found: 1 hour
const MISS_TTL = 60; // not found: 1 minute (stops bad URLs hammering the DB)

async function findTarget(slug: string): Promise<Target> {
  const key = `link:${slug}`;

  // 1) Redis first. Any Redis problem is ignored and we use the DB.
  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as Target; // hit: {id, url} or null
  } catch (err) {
    console.error("Redis error:", err);
  }

  // 2) Miss: ask Postgres (link active AND owner active)
  const link = await prisma.link.findFirst({
    where: {
      slug,
      isActive: true,
      user: { isActive: true },
    },
    select: { id: true, targetUrl: true },
  });

  const target: Target = link ? { id: link.id, url: link.targetUrl } : null;

  // 3) Save it for next time in redis
  try {
    await redis.set(
      `link:${slug}`,
      JSON.stringify(target),
      "EX",
      target ? TTL : MISS_TTL,
    );
  } catch (err) {
    console.error("Redis error saving link:", err);
  }

  return target;
}

// Public short-link redirect: GET /{slug} -> target URL (counts the click).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return new NextResponse("Not found", { status: 404 });
  }

  const target = await findTarget(slug);
  if (!target) return new NextResponse("Short link not found", { status: 404 });

  after(async () => {
    try {
      await prisma.link.update({
        where: { id: target.id },
        data: { clicks: { increment: 1 } },
      });

      await prisma.linkClick.create({
        data: {
          linkId: target.id,
        },
      });
    } catch (err) {
      console.error("Error in click log:", err);
    }
  });

  return NextResponse.redirect(target.url, 307);
}
