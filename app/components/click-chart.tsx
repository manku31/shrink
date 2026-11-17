import type { DayPoint } from "@/lib/stats";

const W = 420;
const H = 240;
const PAD = { top: 12, right: 8, bottom: 26, left: 32 };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Server-rendered, responsive SVG bar chart (scales to container width). */
export function ClickChart({ data, label }: { data: DayPoint[]; label: string }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.clicks)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / data.length;
  const barW = Math.max(2, step * 0.62);
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const labelEvery = data.length > 20 ? 7 : data.length > 10 ? 4 : 2;
  const total = data.reduce((n, d) => n + d.clicks, 0);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${total} clicks`} className="mx-auto h-auto w-full max-w-2xl">
        {ticks.map((t) => {
          const y = PAD.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className="stroke-zinc-200 dark:stroke-zinc-800" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" className="fill-zinc-500 text-[11px]">{t}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.clicks / max) * innerH;
          const x = PAD.left + i * step + (step - barW) / 2;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={PAD.top + innerH - Math.max(h, d.clicks ? 2 : 0)}
                width={barW}
                height={Math.max(h, d.clicks ? 2 : 0)}
                rx={2}
                className="fill-indigo-500 dark:fill-indigo-400"
              >
                <title>{`${fmt(d.date)}: ${d.clicks} ${d.clicks === 1 ? "click" : "clicks"}`}</title>
              </rect>
              {(data.length - 1 - i) % labelEvery === 0 && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-zinc-500 text-[11px]">{fmt(d.date)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {total === 0 && <figcaption className="mt-1 text-center text-xs text-zinc-500">No clicks in this period yet.</figcaption>}
    </figure>
  );
}
