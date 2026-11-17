"use client";

import { useEffect, useRef, useState } from "react";
import { LinkForm } from "./link-form";

/** "+ New link" button that opens the create-link form in a modal (bottom sheet on phones). */
export function NewLinkButton({ host, proto, className }: { host: string; proto: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Bumping the key remounts the form, giving a fresh state each time the modal opens.
  const [session, setSession] = useState(0);

  const open = () => {
    setSession((n) => n + 1);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  // Lock page scroll while the modal is open.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const lock = () => { document.body.style.overflow = "hidden"; };
    const unlock = () => { document.body.style.overflow = ""; };
    d.addEventListener("close", unlock);
    const obs = new MutationObserver(() => (d.open ? lock() : unlock()));
    obs.observe(d, { attributes: true, attributeFilter: ["open"] });
    return () => { d.removeEventListener("close", unlock); obs.disconnect(); unlock(); };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          className ??
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
        }
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        New link
      </button>

      <dialog
        ref={ref}
        aria-labelledby="new-link-title"
        onClick={(e) => { if (e.target === ref.current) close(); }} // click on the backdrop
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl border border-zinc-200 bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 sm:m-auto sm:max-w-md sm:rounded-2xl"
      >
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="new-link-title" className="text-lg font-semibold">Shorten a new link</h2>
            <button type="button" onClick={close} aria-label="Close" className="-mr-2 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <LinkForm key={session} host={host} proto={proto} onNavigate={close} onDone={close} onAnother={() => setSession((n) => n + 1)} />
        </div>
      </dialog>
    </>
  );
}
