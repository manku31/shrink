import { logout } from "../actions/auth";
import type { SessionUser } from "@/lib/dal";
import { Logo } from "./logo";

export function DashboardShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-background pt-[env(safe-area-inset-top)] dark:border-zinc-800">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <Logo href="/admin" />
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-zinc-600 dark:text-zinc-400 sm:inline">{user.username}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm font-medium sm:px-3.5 sm:py-2 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
