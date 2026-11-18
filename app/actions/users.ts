"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { redis } from "@/lib/redis";

/** Soft delete: admins deactivate a user (sets is_active = false). Their links stop working too. */
export async function deactivateUser(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === admin.id) return; // never deactivate yourself

  const links = await prisma.link.findMany({
    where: { userId: id },
    select: { slug: true },
  });

  await prisma.user.updateMany({ where: { id }, data: { isActive: false } });

  if (links.length > 0) {
    try {
      await redis.del(...links.map((l) => `link:${l.slug}`));
    } catch (error) {
      console.error("Error deleting links from Redis:", error);
    }
  }
  revalidatePath("/admin");
}
