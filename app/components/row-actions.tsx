"use client";

import { useState, useTransition } from "react";
import { deleteLink } from "../actions/links";
import { ConfirmDialog } from "./confirm-dialog";

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors md:h-8 md:w-8";
export const neutralBtn = `${iconBtn} border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800`;
const danger = `${iconBtn} border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10`;
export const textBtn = "rounded-md border px-3 py-2 text-xs font-medium transition-colors md:py-1";

const svg = { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

const CopyIcon = () => <svg {...svg}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>;
const CheckIcon = () => <svg {...svg}><path d="m5 13 4 4L19 7" /></svg>;
export const EditIcon = () => <svg {...svg}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
const TrashIcon = () => <svg {...svg}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;

export function CopyIconButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy short link"}
      title={copied ? "Copied!" : "Copy short link"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard unavailable (e.g. insecure context); nothing to do.
        }
      }}
      className={`${neutralBtn} ${copied ? "text-emerald-600 dark:text-emerald-400" : ""}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

/** Delete: asks for confirmation, then soft-deletes the link. */
export function DeleteButton({ id, redirectTo, variant = "icon", onDone }: { id: string; redirectTo?: string; variant?: "icon" | "text"; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Delete link"
        title="Delete"
        className={variant === "icon" ? danger : `${textBtn} border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10`}
      >
        {variant === "icon" ? <TrashIcon /> : "Delete"}
      </button>
      <ConfirmDialog
        open={open}
        pending={pending}
        destructive
        confirmLabel="Delete"
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const fd = new FormData();
            fd.set("id", id);
            if (redirectTo) fd.set("redirectTo", redirectTo);
            await deleteLink(fd);
            setOpen(false);
            onDone?.();
          })
        }
      />
    </>
  );
}
