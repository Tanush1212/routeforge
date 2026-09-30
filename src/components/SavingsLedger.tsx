"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration, formatKm } from "@/lib/geo";
import type { SolveResult } from "@/lib/types";

/**
 * The comparison is the product: the optimized figures never appear without
 * the figures they replaced. Laid out as a ledger, not a hero metric.
 */
export default function SavingsLedger({
  result,
  showBefore,
  onToggleBefore,
}: {
  result: SolveResult;
  showBefore: boolean;
  onToggleBefore: (v: boolean) => void;
}) {
  const saved = result.savedMinutes;
  const animatedMinutes = useCountTo(saved, 700);
  const pct = Math.round(result.savedFraction * 100);
  const improved = result.savedKm > 0.05;

  return (
    <section aria-labelledby="ledger-heading" className="rf-rise">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 id="ledger-heading" className="rf-label">
          Route comparison
        </h2>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-3 select-none">
          <input
            type="checkbox"
            checked={showBefore}
            onChange={(e) => onToggleBefore(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--rf-accent)]"
          />
          Show old route on map
        </label>
      </div>

      <div className="rf-panel overflow-hidden">
        <Row
          swatch="dashed"
          label="Your order"
          sub="As the rows came in"
          km={result.before.distanceKm}
          minutes={result.before.totalMinutes}
          muted
        />
        <Row
          swatch="solid"
          label="Optimized"
          sub={`${result.after.order.length - 1} legs`}
          km={result.after.distanceKm}
          minutes={result.after.totalMinutes}
        />

        <div
          className="flex items-baseline justify-between gap-3 border-t px-3.5 py-3"
          style={{
            borderColor: "var(--rf-rule-strong)",
            background: improved ? "var(--rf-good-soft)" : "var(--rf-panel-2)",
          }}
        >
          <div className="min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: improved ? "var(--rf-good)" : "var(--rf-ink-2)" }}
            >
              {improved ? "You save" : "Already optimal"}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {improved
                ? `${pct}% shorter than the order you uploaded`
                : "The order you uploaded is already the shortest we found"}
            </p>
          </div>

          {improved && (
            <div className="shrink-0 text-right">
              <p
                className="rf-num text-lg leading-tight font-semibold"
                style={{ color: "var(--rf-good)" }}
              >
                {formatDuration(animatedMinutes)}
              </p>
              <p className="rf-num text-xs text-ink-2">
                {formatKm(result.savedKm)}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-snug text-ink-3">
        Distances are straight-line, scaled by your road factor — close enough to
        rank routes, not a substitute for turn-by-turn navigation. Solved{" "}
        <span className="rf-num">{result.elapsedMs.toFixed(0)}ms</span>.
      </p>
    </section>
  );
}

function Row({
  swatch,
  label,
  sub,
  km,
  minutes,
  muted = false,
}: {
  swatch: "dashed" | "solid";
  label: string;
  sub: string;
  km: number;
  minutes: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule px-3.5 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <svg width="18" height="10" aria-hidden className="shrink-0">
          <line
            x1="0"
            y1="5"
            x2="18"
            y2="5"
            stroke={
              swatch === "solid" ? "var(--rf-accent)" : "var(--rf-before)"
            }
            strokeWidth={swatch === "solid" ? 2.5 : 2}
            strokeDasharray={swatch === "dashed" ? "4 3" : undefined}
            strokeLinecap="round"
          />
        </svg>
        <div className="min-w-0">
          <p
            className={`truncate text-sm ${muted ? "text-ink-2" : "font-medium text-ink"}`}
          >
            {label}
          </p>
          <p className="truncate text-[11px] text-ink-3">{sub}</p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`rf-num text-sm ${muted ? "text-ink-2" : "font-medium text-ink"}`}
        >
          {formatKm(km)}
        </p>
        <p className="rf-num text-[11px] text-ink-3">{formatDuration(minutes)}</p>
      </div>
    </div>
  );
}

/** Counts a figure down to its final value once, on mount and on change. */
function useCountTo(target: number, duration: number): number {
  const [value, setValue] = useState(target);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}
