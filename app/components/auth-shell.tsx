import Link from "next/link";
import { Logo } from "./logo";

type Props = {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
  children: React.ReactNode;
};

export function AuthShell({ title, subtitle, footerText, footerLinkLabel, footerHref, children }: Props) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="mb-8"><Logo /></div>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        {children}
      </div>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        {footerText}{" "}
        <Link href={footerHref} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          {footerLinkLabel}
        </Link>
      </p>
    </main>
  );
}
