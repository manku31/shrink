"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LINK_FILTERS, LINK_SORTS } from "@/lib/link-options";

const fieldClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-base text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 md:py-2.5 md:text-sm";

/** Search + filter + sort. State lives in the URL (?q=&filter=&sort=&page=) so it is shareable. */
export function LinksToolbar({ q, sort, filter }: { q: string; sort: string; filter: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const state = useRef({ q, sort, filter });
  const inputRef = useRef<HTMLInputElement>(null);

  function push(next: Partial<typeof state.current>) {
    state.current = { ...state.current, ...next };
    const { q, sort, filter } = state.current;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter !== "all") params.set("filter", filter);
    if (sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `/dashboard/links?${qs}` : "/dashboard/links", { scroll: false }));
  }

  const dirty = q || filter !== "all" || sort !== "newest";
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        push({ q: inputRef.current?.value ?? "" });
      }}
      className={`grid grid-cols-2 gap-3 transition-opacity md:grid-cols-[1fr_11rem_12rem_auto] ${pending ? "opacity-70" : ""}`}
    >
      <div className="relative col-span-2 md:col-span-1">
        <label htmlFor="link-search" className="sr-only">Search links</label>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          id="link-search"
          type="search"
          defaultValue={q}
          placeholder="Search short link or destination"
          autoCapitalize="none"
          autoCorrect="off"
          onChange={(e) => {
            clearTimeout(timer.current);
            const v = e.target.value;
            timer.current = setTimeout(() => push({ q: v }), 300);
          }}
          className={`${fieldClass} pl-10`}
        />
      </div>
      <div>
        <label htmlFor="link-filter" className="sr-only">Filter</label>
        <select id="link-filter" defaultValue={filter} onChange={(e) => push({ filter: e.target.value })} className={fieldClass}>
          {LINK_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="link-sort" className="sr-only">Sort by</label>
        <select id="link-sort" defaultValue={sort} onChange={(e) => push({ sort: e.target.value })} className={fieldClass}>
          {LINK_SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {dirty && (
        <button
          type="button"
          onClick={() => {
            clearTimeout(timer.current);
            if (inputRef.current) inputRef.current.value = "";
            state.current = { q: "", sort: "newest", filter: "all" };
            startTransition(() => router.replace("/dashboard/links", { scroll: false }));
          }}
          className="col-span-2 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:col-span-1"
        >
          Clear
        </button>
      )}
    </form>
  );
}
