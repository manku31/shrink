import "server-only";
import { headers } from "next/headers";

/** Public host + protocol of the current request (for building short URLs). */
export async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { host, proto };
}
