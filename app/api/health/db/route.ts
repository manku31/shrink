import { query } from "@/lib/db";

// Verifies the app can reach Neon Postgres. Returns no connection details.
export async function GET() {
  try {
    const { rows } = await query<{ ok: number; db: string; version: string }>(
      "select 1 as ok, current_database() as db, version() as version",
    );
    return Response.json({ status: "ok", database: rows[0].db, version: rows[0].version });
  } catch (err) {
    console.error("DB health check failed:", err);
    return Response.json({ status: "error" }, { status: 503 });
  }
}
