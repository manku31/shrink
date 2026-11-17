"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateLink } from "../actions/links";

const inputClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:py-2.5 sm:text-sm";

function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{message}</p> : null;
}

export function EditLinkForm({
  id,
  host,
  initial,
}: {
  id: string;
  host: string;
  initial: { name: string; url: string; slug: string };
}) {
  const [state, action, pending] = useActionState(updateLink.bind(null, id), undefined);
  const errors = state?.errors;
  const v = state?.values ?? initial;

  return (
    <form action={action} className="space-y-4">
      {errors?.form && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{errors.form}</p>
      )}
      <div>
        <label htmlFor="name" className="text-sm font-medium">Name <span className="font-normal text-zinc-500">(optional)</span></label>
        <input id="name" name="name" type="text" maxLength={60} defaultValue={v.name} aria-invalid={!!errors?.name} className={`${inputClass} mt-1.5`} />
        <FieldError message={errors?.name} />
      </div>
      <div>
        <label htmlFor="url" className="text-sm font-medium">Destination URL</label>
        <input id="url" name="url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" required defaultValue={v.url} aria-invalid={!!errors?.url} className={`${inputClass} mt-1.5`} />
        <FieldError message={errors?.url} />
      </div>
      <div>
        <label htmlFor="slug" className="text-sm font-medium">Short link</label>
        <div className="mt-1.5 flex min-w-0 items-center rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900">
          <span className="max-w-[45%] shrink-0 truncate pl-3.5 text-sm text-zinc-500">{host}/</span>
          <input id="slug" name="slug" type="text" required autoCapitalize="none" autoCorrect="off" defaultValue={v.slug} aria-invalid={!!errors?.slug} className="min-w-0 flex-1 bg-transparent px-1 py-3 text-base outline-none sm:py-2.5 sm:text-sm" />
        </div>
        <FieldError message={errors?.slug} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/dashboard/links" className="rounded-lg border border-zinc-300 px-4 py-3 text-center text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 sm:py-2.5">Cancel</Link>
        <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60 sm:py-2.5">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
