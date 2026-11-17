import Link from "next/link";
import { Logo } from "./components/logo";

const features = [
  {
    title: "Short, memorable links",
    body: "Turn long URLs into tidy links, or pick your own custom alias that is easy to remember and share.",
    icon: "M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1 1M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1-1",
  },
  {
    title: "Track every click",
    body: "See how many times each link has been opened and which ones perform best, all from one dashboard.",
    icon: "M4 19V9m6 10V5m6 14v-7m4 7H2",
  },
  {
    title: "Yours to manage",
    body: "Copy, review or delete your links any time. Your links live in your account and nobody else can change them.",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4",
  },
];

const demoLinks = [
  { short: "shrink.app/launch", target: "example.com/blog/announcing-our-big-product-launch-2026", clicks: 1284 },
  { short: "shrink.app/docs", target: "example.com/documentation/getting-started/installation", clicks: 642 },
  { short: "shrink.app/Xk9pQ2m", target: "example.com/events/summer-meetup?utm_source=newsletter", clicks: 217 },
  { short: "shrink.app/promo", target: "example.com/pricing?coupon=SPRING&ref=social", clicks: 98 },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200/70 pt-[env(safe-area-inset-top)] bg-background/80 backdrop-blur dark:border-zinc-800/70">
        <nav className="mx-auto flex h-14 sm:h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 sm:px-3.5 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold sm:px-3.5 text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 sm:gap-12 sm:px-6 sm:py-16 grid-cols-1 lg:grid-cols-2 lg:py-24">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              URL shortener
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:mt-5 sm:text-5xl lg:text-6xl">
              Short links, <span className="text-indigo-600 dark:text-indigo-400">big impact.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 sm:mt-5 sm:text-lg sm:leading-8 text-zinc-600 dark:text-zinc-400">
              Shrink turns long, messy links into short ones you can share anywhere, and shows you how many people click them.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
              >
                Get started – it&apos;s free
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-zinc-300 px-6 py-3 text-center text-base font-semibold transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Decorative app preview */}
          <div aria-hidden="true" className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Your links</p>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">2,241 clicks</span>
            </div>
            <ul className="space-y-2.5">
              {demoLinks.map((l) => (
                <li key={l.short} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3.5 py-3 dark:border-zinc-800">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-indigo-600 dark:text-indigo-400">{l.short}</p>
                    <p className="truncate text-xs text-zinc-500">{l.target}</p>
                  </div>
                  <span className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">{l.clicks}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-950 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Everything you need to share links smarter</h2>
            <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 grid-cols-1 md:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={f.icon} /></svg>
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to shorten your first link?</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">Sign up for free and start sharing cleaner links in seconds.</p>
          <Link
            href="/signup"
            className="mt-6 block rounded-lg bg-indigo-600 px-6 py-3 text-base sm:mt-8 sm:inline-block font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Create your free account
          </Link>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-sm text-zinc-500 dark:border-zinc-800">
        © 2026 Shrink. All rights reserved.
      </footer>
    </div>
  );
}
