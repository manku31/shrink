import Link from "next/link";
import { deleteLink } from "../actions/links";
import { CopyButton } from "./copy-button";
import { LinkDetailsModal } from "./link-details-modal";

export type LinkRow = {
  id: string;
  name?: string | null;
  slug: string;
  targetUrl: string;
  clicks: number;
  createdAt: Date;
  owner?: string;
  lastClickedAt?: Date | null;
};

const day = (d: Date) => d.toISOString().slice(0, 10);

export function DeleteButton({ id, redirectTo }: { id: string; redirectTo?: string }) {
  return (
    <form action={deleteLink}>
      <input type="hidden" name="id" value={id} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 md:px-2.5 md:py-1"
      >
        Delete
      </button>
    </form>
  );
}

function EditLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 md:px-2.5 md:py-1"
    >
      Edit
    </Link>
  );
}

function NameModal({
  r, host, short, detailHref, editHref, className,
}: {
  r: LinkRow; host: string; short: string;
  detailHref?: (id: string) => string; editHref?: (id: string) => string; className?: string;
}) {
  return (
    <LinkDetailsModal
      id={r.id}
      name={r.name}
      slug={r.slug}
      host={host}
      short={short}
      targetUrl={r.targetUrl}
      clicks={r.clicks}
      createdAt={r.createdAt.toISOString()}
      lastClickedAt={r.lastClickedAt?.toISOString() ?? null}
      showLast={"lastClickedAt" in r}
      owner={r.owner}
      detailHref={detailHref?.(r.id)}
      editHref={editHref?.(r.id)}
      className={className}
    />
  );
}

export function LinksTable({
  rows,
  host,
  proto,
  detailHref,
  editHref,
}: {
  rows: LinkRow[];
  host: string;
  proto: string;
  /** When set, each row links to its detail page. */
  detailHref?: (id: string) => string;
  /** When set, each row gets an Edit action. */
  editHref?: (id: string) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 sm:p-10">
        No links yet.
      </div>
    );
  }
  const showOwner = rows.some((r) => r.owner);
  return (
    <>
      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const short = `${proto}://${host}/${r.slug}`;
          return (
            <li key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              {r.name && (
                <div className="mb-0.5 text-base">
                  <NameModal r={r} host={host} short={short} detailHref={detailHref} editHref={editHref} className="max-w-full break-words text-left font-semibold hover:text-indigo-600 hover:underline dark:hover:text-indigo-400" />
                </div>
              )}
              {detailHref ? (
                <Link
                  href={detailHref(r.id)}
                  className={`block break-all font-medium text-indigo-600 hover:underline dark:text-indigo-400 ${r.name ? "text-sm" : "text-base"}`}
                >
                  {host}/{r.slug}
                </Link>
              ) : (
                <a
                  href={short}
                  target="_blank"
                  rel="noreferrer"
                  className={`block break-all font-medium text-indigo-600 hover:underline dark:text-indigo-400 ${r.name ? "text-sm" : "text-base"}`}
                >
                  {host}/{r.slug}
                </a>
              )}
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span className="tabular-nums">{r.clicks} {r.clicks === 1 ? "click" : "clicks"}</span>
                <span>Created {day(r.createdAt)}</span>
                {showOwner && r.owner && <span>by {r.owner}</span>}
              </p>
              <div className="mt-3 flex gap-2">
                {detailHref && (
                  <Link
                    href={detailHref(r.id)}
                    className="rounded-md border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  >
                    Details
                  </Link>
                )}
                <CopyButton text={short} />
                {editHref && <EditLink href={editHref(r.id)} />}
                <DeleteButton id={r.id} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Tablet / desktop: table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Link</th>
              {showOwner && <th className="px-4 py-3 font-medium">Owner</th>}
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => {
              const short = `${proto}://${host}/${r.slug}`;
              return (
                <tr key={r.id}>
                  <td className="max-w-[14rem] px-4 py-3">
                    <NameModal r={r} host={host} short={short} detailHref={detailHref} editHref={editHref} />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {detailHref ? (
                      <Link href={detailHref(r.id)} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        {host}/{r.slug}
                      </Link>
                    ) : (
                      <a href={short} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
                        {host}/{r.slug}
                      </a>
                    )}
                  </td>
                  {showOwner && <td className="px-4 py-3">{r.owner}</td>}
                  <td className="px-4 py-3 tabular-nums">{r.clicks}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">{day(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <CopyButton text={short} />
                      {editHref && <EditLink href={editHref(r.id)} />}
                      <DeleteButton id={r.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
