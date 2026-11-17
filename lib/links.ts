import { randomInt } from "node:crypto";

// Paths that already exist as routes; a short link may never shadow them.
export const RESERVED_SLUGS = new Set(["login", "signup", "dashboard", "admin", "api", "favicon.ico", "_next"]);

export const SLUG_RE = /^[a-zA-Z0-9_-]{3,30}$/;
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSlug(length = 7) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Returns a normalized http(s) URL, or null if invalid. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 2048) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}
