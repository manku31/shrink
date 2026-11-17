"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { links } from "@/db/schema";
import { getCurrentUser } from "@/lib/dal";
import { RESERVED_SLUGS, SLUG_RE, generateSlug, normalizeUrl } from "@/lib/links";

const MAX_NAME = 60;

export type LinkState =
  | {
      errors?: Partial<Record<"name" | "url" | "slug" | "form", string>>;
      values?: { name?: string; url?: string; slug?: string };
      success?: boolean;
      /** The short code of the link that was just created. */
      slug?: string;
    }
  | undefined;

export async function createLink(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const user = await getCurrentUser();
  if (!user) return { errors: { form: "Please log in again." } };

  const rawUrl = String(formData.get("url") ?? "");
  const alias = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const values = { name, url: rawUrl, slug: alias };
  const errors: NonNullable<LinkState>["errors"] = {};

  if (name.length > MAX_NAME) errors.name = `Keep the name to ${MAX_NAME} characters or fewer.`;
  const targetUrl = normalizeUrl(rawUrl);
  if (!targetUrl) errors.url = "Enter a valid http(s) URL.";
  if (alias) {
    if (!SLUG_RE.test(alias)) errors.slug = "3–30 characters: letters, numbers, - and _ only.";
    else if (RESERVED_SLUGS.has(alias.toLowerCase())) errors.slug = "That alias is reserved.";
  }
  if (Object.keys(errors).length || !targetUrl) return { errors, values };

  // Custom alias: one attempt. Generated slug: retry on the (rare) collision.
  for (let attempt = 0; attempt < (alias ? 1 : 5); attempt++) {
    const slug = alias || generateSlug();
    try {
      await getDb()
        .insert(links)
        .values({ userId: user.id, name: name || null, slug, targetUrl });
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/links");
      revalidatePath("/admin");
      return { success: true, slug };
    } catch (err) {
      const e = ((err as { cause?: unknown }).cause ?? err) as { code?: string };
      if (e.code === "23505") {
        if (alias) return { errors: { slug: "That alias is already taken." }, values };
        continue;
      }
      console.error("Create link failed:", err);
      return { errors: { form: "Something went wrong. Please try again." }, values };
    }
  }
  return { errors: { form: "Could not generate a short code. Please try again." }, values };
}

export async function deleteLink(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  // Soft delete: owners deactivate their own links; admins can deactivate any.
  const where = user.role === "admin" ? eq(links.id, id) : and(eq(links.id, id), eq(links.userId, user.id));
  await getDb().update(links).set({ isActive: false }).where(and(where, eq(links.isActive, true)));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
  revalidatePath("/admin");
  // Only ever redirect to a known internal path.
  if (formData.get("redirectTo") === "/dashboard/links") redirect("/dashboard/links");
}

export async function updateLink(id: string, _prev: LinkState, formData: FormData): Promise<LinkState> {
  const user = await getCurrentUser();
  if (!user) return { errors: { form: "Please log in again." } };

  const rawUrl = String(formData.get("url") ?? "");
  const alias = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const values = { name, url: rawUrl, slug: alias };
  const errors: NonNullable<LinkState>["errors"] = {};

  if (name.length > MAX_NAME) errors.name = `Keep the name to ${MAX_NAME} characters or fewer.`;
  const targetUrl = normalizeUrl(rawUrl);
  if (!targetUrl) errors.url = "Enter a valid http(s) URL.";
  if (!SLUG_RE.test(alias)) errors.slug = "3–30 characters: letters, numbers, - and _ only.";
  else if (RESERVED_SLUGS.has(alias.toLowerCase())) errors.slug = "That alias is reserved.";
  if (Object.keys(errors).length || !targetUrl) return { errors, values };

  const owned = user.role === "admin" ? eq(links.id, id) : and(eq(links.id, id), eq(links.userId, user.id));
  const where = and(owned, eq(links.isActive, true));
  try {
    const updated = await getDb()
      .update(links)
      .set({ name: name || null, slug: alias, targetUrl })
      .where(where)
      .returning({ id: links.id });
    if (!updated.length) return { errors: { form: "Link not found." }, values };
  } catch (err) {
    const e = ((err as { cause?: unknown }).cause ?? err) as { code?: string };
    if (e.code === "23505") return { errors: { slug: "That alias is already taken." }, values };
    console.error("Update link failed:", err);
    return { errors: { form: "Something went wrong. Please try again." }, values };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
  revalidatePath("/admin");
  return { success: true, slug: alias, values };
}
