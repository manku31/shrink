import "server-only";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { PrismaClient } from "@/generated/prisma/client";

// Pooled Neon connection (PgBouncer). Server-only: credentials must never reach the client.
// Migrations use DATABASE_URL_UNPOOLED instead (see prisma.config.ts).
const g = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Run `neon env pull`.");
  }
  const pool = new Pool({
    connectionString,
    // A fresh TLS connection to Neon costs ~1.5s, so keep warm connections around instead of
    // closing them after pg's 10s default. Keep-alive stops idle sockets being silently dropped.
    idleTimeoutMillis: 5 * 60_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    max: 10,
  });
  // Lets Vercel Fluid compute close idle connections before an instance is suspended.
  attachDatabasePool(pool);
  // Pre-open a few connections in the background so the first (parallel) page queries don't each
  // pay the ~1.5s connect cost.
  void Promise.all([0, 1, 2].map(() => pool.query("select 1"))).catch(() => {});
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// Reuse across hot reloads in dev; module scope is enough in production.
export const prisma = (g.prisma ??= createClient());
