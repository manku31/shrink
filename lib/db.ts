import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "@/db/schema";

// Pooled Neon connection (PgBouncer). Server-only: credentials must never reach the client.
// Use DATABASE_URL_UNPOOLED instead for migrations, pg_dump, LISTEN/NOTIFY.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
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
  return pool;
}

export function getPool(): Pool {
  // Reuse across hot reloads in dev; module scope is enough in production.
  return (globalForDb.pgPool ??= createPool());
}

export const getDb = () => drizzle(getPool(), { schema });

export const query = <T extends object = Record<string, unknown>>(text: string, params?: unknown[]) =>
  getPool().query<T>(text, params);
