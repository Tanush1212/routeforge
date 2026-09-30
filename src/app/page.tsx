"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GoogleMapCanvas from "@/components/GoogleMapCanvas";
import SchematicMap from "@/components/SchematicMap";
import SavingsLedger from "@/components/SavingsLedger";
import SettingsPanel from "@/components/SettingsPanel";
import StopList from "@/components/StopList";
import UploadPanel from "@/components/UploadPanel";
import { Button } from "@/components/ui";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  MoonIcon,
  PrintIcon,
  RouteIcon,
  SunIcon,
} from "@/components/Icons";
import { parseCsv } from "@/lib/csv";
import { download, toCsv, toDriverText } from "@/lib/export";
import { solve } from "@/lib/tsp";
import { DEFAULT_SETTINGS } from "@/lib/types";
import type { ParseIssue, SolveSettings, Stop } from "@/lib/types";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function Page() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [settings, setSettings] = useState<SolveSettings>(DEFAULT_SETTINGS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBefore, setShowBefore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [drawKey, setDrawKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const result = useMemo(() => {
    if (stops.length < 2) return null;
    return solve(stops, settings);
  }, [stops, settings]);

  // Replay the draw-in whenever the route itself changes, not on every render.
  const orderSignature = result?.after.order.join(">") ?? "";
  useEffect(() => {
    if (orderSignature) setDrawKey((k) => k + 1);
  }, [orderSignature]);

  const load = useCallback((text: string, name: string) => {
    setBusy(true);
    const parsed = parseCsv(text);
    setStops(parsed.stops);
    setIssues(parsed.issues);
    setFilename(name);
    setSelectedId(null);
    setBusy(false);
  }, []);

  const loadSample = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/sample-run.csv");
      load(await res.text(), "sample-run.csv");
    } catch {
      setIssues([
        {
          row: 0,
          message: "Could not load the sample file. Upload your own CSV instead.",
          severity: "error",
        },
      ]);
      setBusy(false);
    }
  }, [load]);

  const copyForDriver = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        toDriverText(result.after, stops, settings),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const hasRun = Boolean(result && stops.length >= 2);

  const mapPane = (
    <div className="relative h-full w-full">
      {stops.length === 0 ? (
        <MapEmpty hasKey={Boolean(API_KEY)} />
      ) : API_KEY ? (
        <GoogleMapCanvas
          apiKey={API_KEY}
          stops={stops}
          after={result?.after ?? null}
          before={result?.before ?? null}
          showBefore={showBefore}
          selectedId={selectedId}
          onSelect={setSelectedId}
          drawKey={drawKey}
          themeKey={theme}
        />
      ) : (
        <>
          <SchematicMap
            stops={stops}
            after={result?.after ?? null}
            before={result?.before ?? null}
            showBefore={showBefore}
            selectedId={selectedId}
            onSelect={setSelectedId}
            drawKey={drawKey}
          />
          <p className="absolute right-3 bottom-3 left-3 rounded-lg border border-rule bg-panel/95 px-3 py-2 text-[11px] leading-snug text-ink-2 backdrop-blur-sm sm:right-auto sm:max-w-sm">
            No Maps key — these are plotted positions, not a map. The route shape
            is accurate.
            <span className="hidden sm:inline">
              {" "}
              Add{" "}
              <code className="rf-num text-[10px] text-ink">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              </code>{" "}
              to <code className="rf-num text-[10px] text-ink">.env.local</code>{" "}
              for the real basemap.
            </span>
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="rf-no-print flex shrink-0 items-center justify-between gap-3 border-b border-rule bg-panel px-4 py-3 sm:px-5 lg:py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{
              background: "var(--rf-accent)",
              color: "var(--rf-on-accent)",
            }}
          >
            <RouteIcon size={16} />
          </span>
          <div>
            <h1 className="text-sm leading-tight font-semibold tracking-[-0.02em] text-ink">
              RouteForge
            </h1>
            <p className="text-[11px] leading-tight text-ink-3">
              Shortest run from your storage house
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          className="rounded-lg border border-rule p-1.5 text-ink-2 transition-colors duration-150 hover:bg-panel-2 hover:text-ink"
        >
          {theme === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Working rail */}
        <div className="order-2 flex min-h-0 w-full flex-col border-rule lg:order-1 lg:h-full lg:w-[420px] lg:shrink-0 lg:border-r">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
            <UploadPanel
              onFile={load}
              onSample={loadSample}
              issues={issues}
              filename={filename}
              stopCount={stops.length}
              busy={busy}
            />

            {stops.length > 0 && (
              <SettingsPanel settings={settings} onChange={setSettings} />
            )}

            {result && hasRun && (
              <>
                <SavingsLedger
                  result={result}
                  showBefore={showBefore}
                  onToggleBefore={setShowBefore}
                />

                <StopList
                  plan={result.after}
                  stops={stops}
                  settings={settings}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />

                <section aria-labelledby="handoff-heading" className="rf-no-print">
                  <h2 id="handoff-heading" className="rf-label mb-2.5">
                    Hand it over
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      icon={copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                      onClick={copyForDriver}
                      className="!py-2"
                    >
                      {copied ? "Copied" : "Copy for the driver"}
                    </Button>
                    <Button
                      icon={<DownloadIcon size={16} />}
                      onClick={() =>
                        download(
                          "routeforge-run.csv",
                          toCsv(result.after, stops, settings),
                          "text/csv",
                        )
                      }
                    >
                      CSV
                    </Button>
                    <Button
                      icon={<PrintIcon size={16} />}
                      onClick={() => window.print()}
                    >
                      Print
                    </Button>
                  </div>
                </section>
              </>
            )}

            {stops.length === 0 && <FormatHelp />}
          </div>
        </div>

        {/* Map */}
        <div className="rf-no-print order-1 h-[38vh] min-h-0 w-full shrink-0 border-b border-rule sm:h-[44vh] lg:order-2 lg:h-full lg:flex-1 lg:border-b-0">
          {mapPane}
        </div>
      </div>
    </div>
  );
}

function MapEmpty({ hasKey }: { hasKey: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-panel-2 px-6">
      <div className="max-w-xs text-center">
        <svg
          width="132"
          height="88"
          viewBox="0 0 132 88"
          fill="none"
          aria-hidden
          className="mx-auto"
        >
          <path
            d="M14 70 C 38 68, 40 24, 64 24 S 92 58, 118 20"
            stroke="var(--rf-before)"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
            opacity="0.7"
          />
          {[
            [14, 70],
            [64, 24],
            [118, 20],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="5"
              fill="var(--rf-panel)"
              stroke="var(--rf-before)"
              strokeWidth="2"
            />
          ))}
        </svg>
        <p className="mt-4 text-sm font-medium text-ink">
          Your stops will appear here
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-2">
          {hasKey
            ? "Upload a CSV and the map will frame the run for you."
            : "Upload a CSV to plot them. No Maps key is configured, so locations are plotted rather than mapped."}
        </p>
      </div>
    </div>
  );
}

function FormatHelp() {
  return (
    <section aria-labelledby="format-heading">
      <h2 id="format-heading" className="rf-label mb-2.5">
        What the file needs
      </h2>
      <div className="rf-panel p-3.5">
        <ul className="space-y-2.5 text-xs leading-relaxed text-ink-2">
          <li>
            <span className="font-medium text-ink">name</span> — whatever you
            call the stop. Customer name, order number, anything.
          </li>
          <li>
            <span className="font-medium text-ink">lat</span> and{" "}
            <span className="font-medium text-ink">lng</span> — the coordinates.
            Right-click a spot in Google Maps and the first item on the menu is
            the pair, ready to paste.
          </li>
          <li>
            <span className="font-medium text-ink">type</span> — put{" "}
            <span className="rf-num text-ink">depot</span> on your storage house
            row. Everything else is a stop. Skip the column and the first row is
            used.
          </li>
          <li>
            <span className="font-medium text-ink">service_minutes</span> —
            optional. How long each drop-off takes.
          </li>
        </ul>

        <a
          href="/template.csv"
          download
          className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--rf-accent)] hover:underline"
        >
          <DownloadIcon size={14} />
          Download a starter file
        </a>

        <p className="mt-3.5 border-t border-rule pt-3 text-[11px] leading-relaxed text-ink-3">
          Your file is read in the browser and never uploaded. Customer addresses
          stay on this machine.
        </p>
      </div>
    </section>
  );
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // True once the user has picked a side; until then the OS decides.
  const [explicit, setExplicit] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    let stored: string | null = null;
    try {
      stored = localStorage.getItem("rf-theme");
    } catch {
      /* private mode */
    }

    if (stored === "light" || stored === "dark") {
      setExplicit(true);
      setTheme(stored);
      return;
    }

    setTheme(media.matches ? "dark" : "light");
    const onChange = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Side effects belong here, not in the updater — an updater runs twice in
  // development and must stay pure.
  useEffect(() => {
    if (!explicit) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("rf-theme", theme);
    } catch {
      /* private mode — the choice just will not persist */
    }
  }, [theme, explicit]);

  const toggleTheme = useCallback(() => {
    setExplicit(true);
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
