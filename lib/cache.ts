import "server-only";
import { redis } from "./redis";

export async function cached<T>(
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch {}

  const value = await load();
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch {}
  return value;
}
