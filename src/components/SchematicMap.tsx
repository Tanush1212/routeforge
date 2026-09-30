"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mercatorX, mercatorY } from "@/lib/geo";
import type { RoutePlan, Stop } from "@/lib/types";

interface Props {
  stops: Stop[];
  after: RoutePlan | null;
  before: RoutePlan | null;
  showBefore: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Bumped by the parent on every solve so the draw-in replays. */
  drawKey: number;
}

const PADDING = 56;

/**
 * The map RouteForge falls back to when no Google Maps key is configured.
 * It is not a basemap — it is an accurate relative-position plot in Web
 * Mercator, which is enough to read the shape of a route.
 */
export default function SchematicMap({
  stops,
  after,
  before,
  showBefore,
  selectedId,
  onSelect,
  drawKey,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => {
    if (stops.length === 0) return new Map<string, { x: number; y: number }>();

    const raw = stops.map((s) => ({
      id: s.id,
      mx: mercatorX(s.lng),
      my: mercatorY(s.lat),
    }));

    const minX = Math.min(...raw.map((p) => p.mx));
    const maxX = Math.max(...raw.map((p) => p.mx));
    const minY = Math.min(...raw.map((p) => p.my));
    const maxY = Math.max(...raw.map((p) => p.my));

    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);

    const innerW = Math.max(size.w - PADDING * 2, 10);
    const innerH = Math.max(size.h - PADDING * 2, 10);
    // One scale for both axes keeps the geography undistorted.
    const scale = Math.min(innerW / spanX, innerH / spanY);

    const offsetX = (size.w - spanX * scale) / 2;
    const offsetY = (size.h - spanY * scale) / 2;

    return new Map(
      raw.map((p) => [
        p.id,
        {
          x: offsetX + (p.mx - minX) * scale,
          y: offsetY + (p.my - minY) * scale,
        },
      ]),
    );
  }, [stops, size]);

  const byId = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);

  const pathFor = (plan: RoutePlan | null) => {
    if (!plan) return "";
    const coords = plan.order
      .map((id) => points.get(id))
      .filter((p): p is { x: number; y: number } => Boolean(p));
    if (coords.length < 2) return "";
    return coords
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
  };

  const afterPath = pathFor(after);
  const beforePath = pathFor(before);

  // Visit index per stop, for the marker numbers.
  const visitIndex = useMemo(() => {
    const map = new Map<string, number>();
    if (!after) {
      stops.forEach((s, i) => map.set(s.id, i));
      return map;
    }
    let n = 0;
    for (const id of after.order) {
      if (map.has(id)) continue;
      map.set(id, n);
      n++;
    }
    return map;
  }, [after, stops]);

  const afterLength = useMemo(() => {
    if (!after) return 0;
    const coords = after.order
      .map((id) => points.get(id))
      .filter((p): p is { x: number; y: number } => Boolean(p));
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += Math.hypot(coords[i].x - coords[i - 1].x, coords[i].y - coords[i - 1].y);
    }
    return Math.round(total);
  }, [after, points]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-panel-2"
      style={{
        backgroundImage:
          "linear-gradient(var(--rf-rule) 1px, transparent 1px), linear-gradient(90deg, var(--rf-rule) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        backgroundPosition: "center center",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 35%, var(--rf-canvas) 100%)",
          opacity: 0.85,
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        width={size.w}
        height={size.h}
        role="img"
        aria-label={
          after
            ? `Plot of ${stops.length} locations with the optimized route drawn between them`
            : `Plot of ${stops.length} locations`
        }
      >
        {showBefore && beforePath && (
          <path
            d={beforePath}
            fill="none"
            stroke="var(--rf-before)"
            strokeWidth={1.75}
            strokeDasharray="6 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
          />
        )}

        {afterPath && (
          <g key={drawKey}>
            <path
              d={afterPath}
              fill="none"
              stroke="var(--rf-accent)"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.16}
            />
            <path
              className="rf-draw"
              style={{ "--rf-path-length": afterLength } as React.CSSProperties}
              d={afterPath}
              fill="none"
              stroke="var(--rf-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {stops.map((stop) => {
          const p = points.get(stop.id);
          if (!p) return null;
          const index = visitIndex.get(stop.id) ?? 0;
          const selected = selectedId === stop.id;
          const isDepot = stop.kind === "depot";

          return (
            <g
              key={stop.id}
              transform={`translate(${p.x} ${p.y})`}
              className="cursor-pointer"
              onClick={() => onSelect(selected ? null : stop.id)}
              tabIndex={0}
              role="button"
              aria-label={`${stop.name}${isDepot ? ", storage house" : `, stop ${index}`}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(selected ? null : stop.id);
                }
              }}
            >
              {selected && (
                <circle
                  r={isDepot ? 22 : 19}
                  fill="var(--rf-accent)"
                  opacity={0.16}
                />
              )}

              {isDepot ? (
                <>
                  <rect
                    x={-13}
                    y={-13}
                    width={26}
                    height={26}
                    rx={5}
                    fill="var(--rf-ink)"
                    stroke="var(--rf-panel)"
                    strokeWidth={2}
                  />
                  <path
                    d="M-6 0.5 0 -5.5 6 0.5V6a.8.8 0 0 1-.8.8H-5.2A.8.8 0 0 1-6 6z"
                    fill="none"
                    stroke="var(--rf-canvas)"
                    strokeWidth={1.4}
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <>
                  <circle
                    r={12}
                    fill="var(--rf-accent)"
                    stroke="var(--rf-panel)"
                    strokeWidth={2}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={0.5}
                    fill="var(--rf-on-accent)"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {index}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {selectedId && byId.get(selectedId) && (
        <MapTip stop={byId.get(selectedId)!} point={points.get(selectedId)} />
      )}
    </div>
  );
}

function MapTip({
  stop,
  point,
}: {
  stop: Stop;
  point?: { x: number; y: number };
}) {
  if (!point) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-rule bg-panel px-3 py-2 text-xs shadow-[var(--rf-shadow-md)]"
      style={{ left: point.x, top: point.y - 22 }}
    >
      <p className="font-medium text-ink">{stop.name}</p>
      {stop.address && <p className="mt-0.5 text-ink-3">{stop.address}</p>}
      <p className="rf-num mt-1 text-[10px] text-ink-3">
        {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
      </p>
    </div>
  );
}
