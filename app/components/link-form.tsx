"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createLink } from "../actions/links";

const inputClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:py-2.5 sm:text-sm";

function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{message}</p> : null;
}

/**
 * The create-link form, rendered inside the "New link" modal.
 * After a successful save it swaps to a "Saved" view; the saved banner and short link go to /dashboard/links.
 */
export function LinkForm({
  host,
  proto,
  onNavigate,
  onDone,
  onAnother,
}: {
  host: string;
  proto: string;
  /** Called when the user follows a link out of the modal (so it can close). */
  onNavigate: () => void;
  onDone: () => void;
  onAnother: () => void;
}) {
  const [state, action, pending] = useActionState(createLink, undefined);
  const errors = state?.errors;

  if (state?.success && state.slug) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/links"
          onClick={onNavigate}
          className="block rounded-xl bg-emerald-50 p-4 text-emerald-800 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
        >
          <span className="flex items-center gap-2 font-semibold">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
            Saved
          </span>
          <span className="mt-1 block break-all text-sm font-medium underline-offset-2 hover:underline">
            {proto}://{host}/{state.slug}
          </span>
          <span className="mt-2 block text-xs opacity-80">View all your links →</span>
        </Link>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onAnother} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 sm:py-2.5">
            Create another
          </button>
          <button type="button" onClick={onDone} className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 sm:py-2.5">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {errors?.form && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{errors.form}</p>
      )}
      <div>
        <label htmlFor="url" className="text-sm font-medium">Destination URL</label>
        <input
          id="url"
          name="url"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          required
          placeholder="https://example.com/a/very/long/link"
          defaultValue={state?.values?.url}
          aria-invalid={!!errors?.url}
          className={`${inputClass} mt-1.5`}
        />
        <FieldError message={errors?.url} />
      </div>
      <div>
        <label htmlFor="name" className="text-sm font-medium">Name <span className="font-normal text-zinc-500">(optional)</span></label>
        <input
          id="name"
          name="name"
          type="text"
          maxLength={60}
          placeholder="e.g. Summer sale"
          defaultValue={state?.values?.name}
          aria-invalid={!!errors?.name}
          className={`${inputClass} mt-1.5`}
        />
        <FieldError message={errors?.name} />
      </div>
      <div>
        <label htmlFor="slug" className="text-sm font-medium">Custom alias <span className="font-normal text-zinc-500">(optional)</span></label>
        <div className="mt-1.5 flex min-w-0 items-center rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900">
          <span className="max-w-[45%] shrink-0 truncate pl-3.5 text-sm text-zinc-500">{host}/</span>
          <input
            id="slug"
            name="slug"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="custom"
            defaultValue={state?.values?.slug}
            aria-invalid={!!errors?.slug}
            className="min-w-0 flex-1 bg-transparent px-1 py-3 text-base outline-none placeholder:text-zinc-400 sm:py-2.5 sm:text-sm"
          />
        </div>
        <FieldError message={errors?.slug} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-60 sm:py-2.5 sm:text-sm"
      >
        {pending ? "Saving…" : "Save link"}
      </button>
    </form>
  );
}
