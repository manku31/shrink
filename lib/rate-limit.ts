import "server-only";
import { headers } from "next/headers";
import { redis } from "./redis";

const WINDOW_SECONDS = 15 * 60;

/** Best-effort client IP. Behind Vercel (or any trusted proxy) x-forwarded-for is set by the platform. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

type Rule = { key: string; limit: number };

/** True if any rule has already used up its attempts. Read-only. Fails open if Redis is down. */
export async function isLimited(rules: Rule[]): Promise<boolean> {
  try {
    const counts = await redis.mget(...rules.map((r) => r.key));
    return rules.some((r, i) => Number(counts[i] ?? 0) >= r.limit);
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return false;
  }
}

/** Count one failed attempt against every key. The window starts at the first failure. */
export async function recordFailure(keys: string[]): Promise<void> {
  try {
    for (const key of keys) {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, WINDOW_SECONDS);
    }
  } catch (err) {
    console.error("Rate limit record failed:", err);
  }
}

export async function clearKeys(keys: string[]): Promise<void> {
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error("Rate limit clear failed:", err);
  }
}
