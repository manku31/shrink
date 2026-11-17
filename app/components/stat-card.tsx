export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <p className="text-xs font-medium text-zinc-500 sm:text-sm">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
