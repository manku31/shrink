"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateLink } from "../actions/links";
import { ConfirmDialog } from "./confirm-dialog";
import { EditIcon, neutralBtn, textBtn } from "./row-actions";

const inputClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:py-2.5 sm:text-sm";

function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{message}</p> : null;
}

function EditForm({ id, host, initial, onClose }: { id: string; host: string; initial: { name: string; url: string; slug: string }; onClose: () => void }) {
  const [state, action, pending] = useActionState(updateLink.bind(null, id), undefined);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state?.errors;
  const v = state?.values ?? initial;

  // Saved: close the modal. (The list refreshes itself via revalidatePath.)
  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <>
      <form ref={formRef} action={action} className="space-y-4" onSubmit={(e) => { if (!confirming) e.preventDefault(); }}>
        {errors?.form && (
          <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{errors.form}</p>
        )}
        <div>
          <label htmlFor={`edit-name-${id}`} className="text-sm font-medium">Name <span className="font-normal text-zinc-500">(optional)</span></label>
          <input id={`edit-name-${id}`} name="name" type="text" maxLength={60} defaultValue={v.name} aria-invalid={!!errors?.name} className={`${inputClass} mt-1.5`} />
          <FieldError message={errors?.name} />
        </div>
        <div>
          <label htmlFor={`edit-url-${id}`} className="text-sm font-medium">Destination URL</label>
          <input id={`edit-url-${id}`} name="url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" required defaultValue={v.url} aria-invalid={!!errors?.url} className={`${inputClass} mt-1.5`} />
          <FieldError message={errors?.url} />
        </div>
        <div>
          <label htmlFor={`edit-slug-${id}`} className="text-sm font-medium">Short link</label>
          <div className="mt-1.5 flex min-w-0 items-center rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900">
            <span className="max-w-[45%] shrink-0 truncate pl-3.5 text-sm text-zinc-500">{host}/</span>
            <input id={`edit-slug-${id}`} name="slug" type="text" required autoCapitalize="none" autoCorrect="off" defaultValue={v.slug} aria-invalid={!!errors?.slug} className="min-w-0 flex-1 bg-transparent px-1 py-3 text-base outline-none sm:py-2.5 sm:text-sm" />
          </div>
          <FieldError message={errors?.slug} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 sm:py-2.5">
            Cancel
          </button>
          {/* Saving asks for confirmation first; the form is only submitted after "Yes". */}
          <button
            type="button"
            disabled={pending}
            onClick={() => { if (formRef.current?.reportValidity()) setConfirming(true); }}
            className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60 sm:py-2.5"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
      <ConfirmDialog
        open={confirming}
        pending={pending}
        title="Save changes?"
        message="Are you sure you want to do that?"
        confirmLabel="Yes, save"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          formRef.current?.requestSubmit();
          setConfirming(false);
        }}
      />
    </>
  );
}

/** Edit button that opens the edit form in a modal. The confirmation appears only when saving. */
export function EditLinkModal({
  id,
  host,
  initial,
  variant = "icon",
}: {
  id: string;
  host: string;
  initial: { name: string; url: string; slug: string };
  variant?: "icon" | "text";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Bumping the key remounts the form so it starts fresh (and with current data) each time it opens.
  const [session, setSession] = useState(0);
  const [open, setOpen] = useState(false);

  const show = () => { setSession((n) => n + 1); setOpen(true); ref.current?.showModal(); };
  const close = () => { setOpen(false); ref.current?.close(); };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const sync = () => { document.body.style.overflow = d.open ? "hidden" : ""; };
    const obs = new MutationObserver(sync);
    obs.observe(d, { attributes: true, attributeFilter: ["open"] });
    return () => { obs.disconnect(); document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Edit link"
        title="Edit"
        className={variant === "icon" ? neutralBtn : `${textBtn} border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`}
      >
        {variant === "icon" ? <EditIcon /> : "Edit"}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`edit-title-${id}`}
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === ref.current) close(); }}
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl border border-zinc-200 bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 sm:m-auto sm:max-w-md sm:rounded-2xl"
      >
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id={`edit-title-${id}`} className="text-lg font-semibold">Edit link</h2>
            <button type="button" onClick={close} aria-label="Close" className="-mr-2 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          {open && <EditForm key={session} id={id} host={host} initial={initial} onClose={close} />}
        </div>
      </dialog>
    </>
  );
}
