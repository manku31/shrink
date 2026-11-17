import { logout } from "../actions/auth";
import type { SessionUser } from "@/lib/dal";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

function LogoutButton({ className }: { className: string }) {
  return (
    <form action={logout}>
      <button type="submit" className={className}>Log out</button>
    </form>
  );
}

/**
 * Mobile: slim top bar + fixed bottom tab bar.
 * md+: fixed left sidebar with nav, username and log out.
 */
export function UserShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950 md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-background p-4 dark:border-zinc-800 md:sticky md:top-0 md:flex md:h-dvh">
        <div className="px-1 py-2"><Logo href="/dashboard" /></div>
        <nav aria-label="Dashboard" className="mt-6 flex flex-col gap-1">
          <NavLinks variant="side" />
        </nav>
        <div className="mt-auto border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="truncate px-1 text-sm font-medium">{user.username}</p>
          <p className="truncate px-1 text-xs text-zinc-500">{user.email}</p>
          <LogoutButton className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800 md:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Logo href="/dashboard" />
          <LogoutButton className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" />
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-8 md:pb-10 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-200 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 md:hidden"
      >
        <NavLinks variant="tabs" />
      </nav>
    </div>
  );
}
