"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CopyButton } from "./copy-button";
import { DeleteButton } from "./row-actions";
import { EditLinkModal } from "./edit-link-modal";

type Props = {
  id: string;
  name?: string | null;
  slug: string;
  host: string;
  short: string;
  targetUrl: string;
  clicks: number;
  createdAt: string;
  lastClickedAt?: string | null;
  showLast: boolean;
  owner?: string;
  detailHref?: string;
  editable?: boolean;
  className?: string;
};

function Field({ label, children, copy }: { label: string; children: React.ReactNode; copy?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 flex items-start justify-between gap-3">
        <span className="min-w-0 break-all text-sm [overflow-wrap:anywhere]">{children}</span>
        {copy && <span className="shrink-0"><CopyButton text={copy} /></span>}
      </dd>
    </div>
  );
}

const fmt = (iso: string) => iso.slice(0, 10);

/** The link's name, as a button that opens a modal with all of the link's details. */
export function LinkDetailsModal(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const unlock = () => { document.body.style.overflow = ""; };
    const obs = new MutationObserver(() => {
      document.body.style.overflow = d.open ? "hidden" : "";
    });
    obs.observe(d, { attributes: true, attributeFilter: ["open"] });
    d.addEventListener("close", unlock);
    return () => { obs.disconnect(); d.removeEventListener("close", unlock); unlock(); };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={p.className ?? "max-w-full truncate text-left font-semibold hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"}
        title={p.name ?? undefined}
      >
        {p.name || <span className="font-normal text-zinc-400">Untitled</span>}
      </button>

      <dialog
        ref={ref}
        aria-labelledby={`details-${p.id}`}
        onClick={(e) => { if (e.target === ref.current) close(); }}
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl border border-zinc-200 bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 sm:m-auto sm:max-w-md sm:rounded-2xl"
      >
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id={`details-${p.id}`} className="text-lg font-semibold">Link details</h2>
            <button type="button" onClick={close} aria-label="Close" className="-mr-2 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>

          <dl className="space-y-4">
            <Field label="Name">{p.name || <span className="text-zinc-400">—</span>}</Field>
            <Field label="Short link" copy={p.short}>
              <a href={p.short} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">{p.host}/{p.slug}</a>
            </Field>
            <Field label="Original link" copy={p.targetUrl}>
              <a href={p.targetUrl} target="_blank" rel="noreferrer" className="hover:underline">{p.targetUrl}</a>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Total clicks"><span className="tabular-nums">{p.clicks}</span></Field>
              <Field label="Created">{fmt(p.createdAt)}</Field>
              {p.showLast && <Field label="Last click">{p.lastClickedAt ? fmt(p.lastClickedAt) : "No clicks yet"}</Field>}
              {p.owner && <Field label="Owner">{p.owner}</Field>}
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {p.detailHref && (
              <Link href={p.detailHref} className="rounded-md border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                View stats
              </Link>
            )}
            {p.editable && <EditLinkModal id={p.id} host={p.host} variant="text" initial={{ name: p.name ?? "", url: p.targetUrl, slug: p.slug }} />}
            <DeleteButton id={p.id} variant="text" onDone={close} />
          </div>
        </div>
      </dialog>
    </>
  );
}
