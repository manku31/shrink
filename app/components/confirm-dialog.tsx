"use client";

import { useEffect, useRef } from "react";

/** Modal asking the user to confirm an action. Controlled: render it with `open` and handle cancel/confirm. */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  pending = false,
  confirmLabel = "Confirm",
  destructive = false,
  title = "Are you sure?",
  message = "Are you sure you want to perform this action? This action cannot be undone.",
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
  confirmLabel?: string;
  destructive?: boolean;
  title?: string;
  message?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => { e.preventDefault(); if (!pending) onCancel(); }} // Esc key
      onClick={(e) => { if (e.target === ref.current && !pending) onCancel(); }} // backdrop
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-zinc-200 bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="p-5 sm:p-6">
        <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              destructive ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
