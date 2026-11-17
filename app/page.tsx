import Link from "next/link";
import { Logo } from "./components/logo";

const features = [
  {
    title: "Organize everything",
    body: "Capture tasks in projects, add due dates, priorities and labels, and see what matters at a glance.",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
  {
    title: "Collaborate in real time",
    body: "Assign tasks, comment, and keep your whole team aligned without endless status meetings.",
    icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4.13a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6M3 9a3 3 0 106 0",
  },
  {
    title: "Track your progress",
    body: "Boards, lists and calendars show how work is moving so deadlines never sneak up on you.",
    icon: "M4 19V9m6 10V5m6 14v-7m4 7H2",
  },
];

const demoTasks = [
  { label: "Design onboarding flow", done: true },
  { label: "Review pull requests", done: true },
  { label: "Write release notes", done: false },
  { label: "Plan next sprint", done: false },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-background/80 backdrop-blur dark:border-zinc-800/70">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              Task management, simplified
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
              Get more done, <span className="text-indigo-600 dark:text-indigo-400">together.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              TaskFlow helps you and your team plan, prioritize and finish work in one calm, organized place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
          <div aria-hidden="true" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Today</p>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">2 of 4 done</span>
            </div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full w-1/2 rounded-full bg-indigo-600" />
            </div>
            <ul className="space-y-2.5">
              {demoTasks.map((t) => (
                <li key={t.label} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3.5 py-3 dark:border-zinc-800">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${t.done ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-600"}`}>
                    {t.done && (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    )}
                  </span>
                  <span className={`text-sm ${t.done ? "text-zinc-400 line-through" : ""}`}>{t.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-950 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight">Everything you need to stay on track</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
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

        <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight">Ready to take control of your tasks?</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">Join TaskFlow today and turn your to-do list into done.</p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Create your free account
          </Link>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
        © 2026 TaskFlow. All rights reserved.
      </footer>
    </div>
  );
}
