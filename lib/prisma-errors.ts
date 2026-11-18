/**
 * If `err` is a Prisma unique-constraint violation (P2002), returns the name of the violated
 * index/constraint (e.g. "links_slug_idx"); otherwise null.
 * The name is read from the driver error because some of our unique indexes (lower(email),
 * lower(username)) are expression indexes that Prisma's own `meta.target` doesn't report.
 */
export function uniqueViolation(err: unknown): string | null {
  const e = err as { code?: string; meta?: { driverAdapterError?: { cause?: { constraint?: { index?: string } } } } };
  if (e?.code !== "P2002") return null;
  return e.meta?.driverAdapterError?.cause?.constraint?.index ?? "unknown";
}
