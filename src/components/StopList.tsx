"use client";

import { useMemo } from "react";
import { formatClock, formatKm } from "@/lib/geo";
import type { RoutePlan, SolveSettings, Stop } from "@/lib/types";
import { DepotIcon } from "./Icons";

interface Props {
  plan: RoutePlan;
  stops: Stop[];
  settings: SolveSettings;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export interface RunRow {
  key: string;
  stop: Stop;
  /** Visit number. 0 is the storage house. */
  index: number;
  legKm: number;
  arriveMinutes: number;
  departMinutes: number;
  isFinalReturn: boolean;
}

export function buildRows(
  plan: RoutePlan,
  stops: Stop[],
  settings: SolveSettings,
): RunRow[] {
  const byId = new Map(stops.map((s) => [s.id, s]));
  const rows: RunRow[] = [];
  let clock = settings.startMinutes;

  plan.order.forEach((id, i) => {
    const stop = byId.get(id);
    if (!stop) return;

    const leg = i === 0 ? null : plan.legs[i - 1];
    if (leg) clock += leg.driveMinutes;

    const isFinalReturn = i > 0 && stop.kind === "depot";
    const arrive = clock;
    const service = i === 0 || isFinalReturn ? 0 : stop.serviceMinutes;
    clock += service;

    rows.push({
      key: `${id}-${i}`,
      stop,
      index: i,
      legKm: leg?.distanceKm ?? 0,
      arriveMinutes: arrive,
      departMinutes: clock,
      isFinalReturn,
    });
  });

  return rows;
}

export default function StopList({
  plan,
  stops,
  settings,
  selectedId,
  onSelect,
}: Props) {
  const rows = useMemo(
    () => buildRows(plan, stops, settings),
    [plan, stops, settings],
  );

  return (
    <section aria-labelledby="run-heading">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 id="run-heading" className="rf-label">
          The run
        </h2>
        <p className="rf-num text-[11px] text-ink-3">
          {formatClock(rows[0]?.arriveMinutes ?? 0)} &rarr;{" "}
          {formatClock(rows[rows.length - 1]?.departMinutes ?? 0)}
        </p>
      </div>

      <ol className="rf-panel overflow-hidden">
        {rows.map((row) => {
          const selected = selectedId === row.stop.id;
          const isDepot = row.stop.kind === "depot";

          return (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => onSelect(selected ? null : row.stop.id)}
                aria-current={selected || undefined}
                className={`flex w-full items-start gap-3 border-b border-rule px-3 py-2.5 text-left transition-colors duration-150 last:border-b-0 ${
                  selected ? "bg-[var(--rf-accent-soft)]" : "hover:bg-panel-2"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {isDepot ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--rf-ink)] text-[var(--rf-canvas)]">
                      <DepotIcon size={13} />
                    </span>
                  ) : (
                    <span
                      className="rf-num flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{
                        background: "var(--rf-accent)",
                        color: "var(--rf-on-accent)",
                      }}
                    >
                      {row.index}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {row.isFinalReturn ? `Back to ${row.stop.name}` : row.stop.name}
                  </span>
                  {row.stop.address && (
                    <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                      {row.stop.address}
                    </span>
                  )}
                  {!isDepot && row.stop.serviceMinutes > 0 && (
                    <span className="rf-num mt-0.5 block text-[11px] text-ink-3">
                      {row.stop.serviceMinutes} min drop-off
                    </span>
                  )}
                </span>

                <span className="shrink-0 text-right">
                  <span className="rf-num block text-xs font-medium text-ink">
                    {formatClock(row.arriveMinutes)}
                  </span>
                  {row.index > 0 && (
                    <span className="rf-num block text-[11px] text-ink-3">
                      +{formatKm(row.legKm)}
                    </span>
                  )}
                  {row.index === 0 && (
                    <span className="block text-[11px] text-ink-3">start</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
