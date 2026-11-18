"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueViolation } from "@/lib/prisma-errors";
import { getCurrentUser } from "@/lib/dal";
import {
  RESERVED_SLUGS,
  SLUG_RE,
  generateSlug,
  normalizeUrl,
} from "@/lib/links";
import { redis } from "@/lib/redis";

const MAX_NAME = 60;
const UUID_RE = /^[0-9a-f-]{36}$/i; // anything else would make Postgres fail on the uuid cast

export type LinkState =
  | {
      errors?: Partial<Record<"name" | "url" | "slug" | "form", string>>;
      values?: { name?: string; url?: string; slug?: string };
      success?: boolean;
      /** The short code of the link that was just created. */
      slug?: string;
    }
  | undefined;

export async function createLink(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await getCurrentUser();
  if (!user) return { errors: { form: "Please log in again." } };

  const rawUrl = String(formData.get("url") ?? "");
  const alias = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const values = { name, url: rawUrl, slug: alias };
  const errors: NonNullable<LinkState>["errors"] = {};

  if (name.length > MAX_NAME)
    errors.name = `Keep the name to ${MAX_NAME} characters or fewer.`;
  const targetUrl = normalizeUrl(rawUrl);
  if (!targetUrl) errors.url = "Enter a valid http(s) URL.";
  if (alias) {
    if (!SLUG_RE.test(alias))
      errors.slug = "3–30 characters: letters, numbers, - and _ only.";
    else if (RESERVED_SLUGS.has(alias.toLowerCase()))
      errors.slug = "That alias is reserved.";
  }
  if (Object.keys(errors).length || !targetUrl) return { errors, values };

  // Custom alias: one attempt. Generated slug: retry on the (rare) collision.
  for (let attempt = 0; attempt < (alias ? 1 : 5); attempt++) {
    const slug = alias || generateSlug();
    try {
      await prisma.link.create({
        data: { userId: user.id, name: name || null, slug, targetUrl },
      });

      try {
        await redis.del(`link:${slug}`);
      } catch (err) {
        console.error("Failed to delete link from history:", err);
      }

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/links");
      revalidatePath("/admin");
      return { success: true, slug };
    } catch (err) {
      if (uniqueViolation(err)) {
        if (alias)
          return { errors: { slug: "That alias is already taken." }, values };
        continue;
      }
      console.error("Create link failed:", err);
      return {
        errors: { form: "Something went wrong. Please try again." },
        values,
      };
    }
  }
  return {
    errors: { form: "Could not generate a short code. Please try again." },
    values,
  };
}

export async function deleteLink(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (UUID_RE.test(id)) {
    const old = await prisma.link.findFirst({
      where: {
        id,
        isActive: true,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
      select: { slug: true },
    });

    // Soft delete: owners deactivate their own links; admins can deactivate any.
    await prisma.link.updateMany({
      where: {
        id,
        isActive: true,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
      data: { isActive: false },
    });

    if (old?.slug) {
      try {
        await redis.del(`link:${old.slug}`);
      } catch (err) {
        console.error("Failed to delete link from history:", err);
      }
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
  revalidatePath("/admin");
  // Only ever redirect to a known internal path.
  if (formData.get("redirectTo") === "/dashboard/links")
    redirect("/dashboard/links");
}

export async function updateLink(
  id: string,
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await getCurrentUser();
  if (!user) return { errors: { form: "Please log in again." } };

  const rawUrl = String(formData.get("url") ?? "");
  const alias = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const values = { name, url: rawUrl, slug: alias };
  const errors: NonNullable<LinkState>["errors"] = {};

  if (name.length > MAX_NAME)
    errors.name = `Keep the name to ${MAX_NAME} characters or fewer.`;
  const targetUrl = normalizeUrl(rawUrl);
  if (!targetUrl) errors.url = "Enter a valid http(s) URL.";
  if (!SLUG_RE.test(alias))
    errors.slug = "3–30 characters: letters, numbers, - and _ only.";
  else if (RESERVED_SLUGS.has(alias.toLowerCase()))
    errors.slug = "That alias is reserved.";
  if (Object.keys(errors).length || !targetUrl) return { errors, values };

  if (!UUID_RE.test(id)) return { errors: { form: "Link not found." }, values };
  try {
    const old = await prisma.link.findFirst({
      where: {
        id,
        isActive: true,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
      select: { slug: true },
    });

    const { count } = await prisma.link.updateMany({
      where: {
        id,
        isActive: true,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      }, // owner (or admin) only
      data: { name: name || null, slug: alias, targetUrl },
    });
    if (!count) return { errors: { form: "Link not found." }, values };

    const key = [`link:${alias}`];
    if (old?.slug && old.slug !== alias) key.push(`link:${old.slug}`);
    try {
      await redis.del(...key);
    } catch (err) {
      console.error("Failed to delete link from history:", err);
    }
  } catch (err) {
    if (uniqueViolation(err))
      return { errors: { slug: "That alias is already taken." }, values };
    console.error("Update link failed:", err);
    return {
      errors: { form: "Something went wrong. Please try again." },
      values,
    };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
  revalidatePath("/admin");
  return { success: true, slug: alias, values };
}
