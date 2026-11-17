import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { getOrigin } from "@/lib/origin";
import { links } from "@/db/schema";
import { UserShell } from "../../../../components/user-shell";
import { EditLinkForm } from "../../../../components/edit-link-form";

export const instant = false;

export const metadata: Metadata = { title: "Edit link – Shrink" };

export default async function EditLinkPage({ params }: PageProps<"/dashboard/links/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [link] = await getDb()
    .select()
    .from(links)
    .where(and(eq(links.id, id), eq(links.userId, user.id), eq(links.isActive, true)))
    .limit(1);
  if (!link) notFound();
  const { host } = await getOrigin();

  return (
    <UserShell user={user}>
      <Link href="/dashboard/links" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
        <span aria-hidden="true">←</span> All links
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Edit link</h1>
      <div className="mt-5 max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <EditLinkForm id={link.id} host={host} initial={{ name: link.name ?? "", url: link.targetUrl, slug: link.slug }} />
      </div>
    </UserShell>
  );
}
