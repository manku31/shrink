import { connection } from "next/server";
import { query } from "@/lib/db";

// Liveness check: confirms the app can reach Postgres. Deliberately returns nothing
// about the database (name, version, host), since this route is public.
export async function GET() {
  await connection();
  try {
    await query("select 1");
    return Response.json({ status: "ok" });
  } catch (err) {
    console.error("DB health check failed:", err);
    return Response.json({ status: "error" }, { status: 503 });
  }
}
