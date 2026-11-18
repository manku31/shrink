import "server-only";
import Redis from "ioredis";

const g = globalThis as unknown as { redis: Redis | undefined };

export const redis = (g.redis ??= new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 1, // fail fast instead of hanging the page
  enableOfflineQueue: false, // don't queue commands while disconnected
}));

  redis.on("error", (e) => console.error("Redis error:", e.message));
