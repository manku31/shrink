import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Pooled Neon connection (PgBouncer). Server-only: credentials must never reach the client.
// Use DATABASE_URL_UNPOOLED instead for migrations, pg_dump, LISTEN/NOTIFY.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Run `neon env pull`.");
  }
  const pool = new Pool({ connectionString });
  // Lets Vercel Fluid compute close idle connections before an instance is suspended.
  attachDatabasePool(pool);
  return pool;
}

export function getPool(): Pool {
  // Reuse across hot reloads in dev; module scope is enough in production.
  return (globalForDb.pgPool ??= createPool());
}

export const query = <T extends object = Record<string, unknown>>(text: string, params?: unknown[]) =>
  getPool().query<T>(text, params);
