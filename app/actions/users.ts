"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

/** Soft delete: admins deactivate a user (sets is_active = false). Their links stop working too. */
export async function deactivateUser(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === admin.id) return; // never deactivate yourself
  await prisma.user.updateMany({ where: { id }, data: { isActive: false } });
  revalidatePath("/admin");
}
