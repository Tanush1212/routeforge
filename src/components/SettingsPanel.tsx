"use client";

import { formatClock, parseClock } from "@/lib/geo";
import type { SolveSettings } from "@/lib/types";
import { Field, Toggle } from "./ui";

export default function SettingsPanel({
  settings,
  onChange,
}: {
  settings: SolveSettings;
  onChange: (next: SolveSettings) => void;
}) {
  const startValue = `${String(Math.floor(settings.startMinutes / 60)).padStart(2, "0")}:${String(
    settings.startMinutes % 60,
  ).padStart(2, "0")}`;

  const speedInvalid = settings.speedKmh <= 0;
  const factorInvalid = settings.roadFactor < 1 || settings.roadFactor > 3;

  return (
    <section aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="rf-label mb-2.5">
        Run settings
      </h2>

      <div className="rf-panel space-y-3.5 p-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="speed"
            label="Average speed"
            suffix="km/h"
            value={String(settings.speedKmh)}
            min={1}
            max={140}
            invalid={speedInvalid}
            onChange={(v) =>
              onChange({ ...settings, speedKmh: Math.max(1, Number(v) || 1) })
            }
          />
          <Field
            id="start"
            label="Leave at"
            type="time"
            value={startValue}
            onChange={(v) => {
              const parsed = parseClock(v);
              if (parsed !== null) onChange({ ...settings, startMinutes: parsed });
            }}
          />
        </div>

        <Field
          id="factor"
          label="Road factor"
          suffix="×"
          step={0.05}
          min={1}
          max={3}
          invalid={factorInvalid}
          value={String(settings.roadFactor)}
          hint="Straight-line distance is multiplied by this to approximate real roads. 1.3 suits most cities; raise it where the grid is broken by rivers or hills."
          onChange={(v) =>
            onChange({
              ...settings,
              roadFactor: Math.min(3, Math.max(1, Number(v) || 1)),
            })
          }
        />

        <div className="border-t border-rule pt-3.5">
          <Toggle
            id="return"
            label="Return to the storage house"
            hint={`The run ends back where it started, arriving around ${formatClock(
              settings.startMinutes,
            )} plus the total.`}
            checked={settings.returnToDepot}
            onChange={(v) => onChange({ ...settings, returnToDepot: v })}
          />
        </div>
      </div>
    </section>
  );
}
