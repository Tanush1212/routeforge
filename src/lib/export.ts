import { formatClock, formatKm } from "./geo";
import type { RoutePlan, SolveSettings, Stop } from "./types";

interface Row {
  index: number;
  stop: Stop;
  legKm: number;
  arriveMinutes: number;
  isFinalReturn: boolean;
}

function rowsOf(
  plan: RoutePlan,
  stops: Stop[],
  settings: SolveSettings,
): Row[] {
  const byId = new Map(stops.map((s) => [s.id, s]));
  const rows: Row[] = [];
  let clock = settings.startMinutes;

  plan.order.forEach((id, i) => {
    const stop = byId.get(id);
    if (!stop) return;
    const leg = i === 0 ? null : plan.legs[i - 1];
    if (leg) clock += leg.driveMinutes;
    const isFinalReturn = i > 0 && stop.kind === "depot";
    const arrive = clock;
    if (i > 0 && !isFinalReturn) clock += stop.serviceMinutes;
    rows.push({
      index: i,
      stop,
      legKm: leg?.distanceKm ?? 0,
      arriveMinutes: arrive,
      isFinalReturn,
    });
  });

  return rows;
}

const quote = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function toCsv(
  plan: RoutePlan,
  stops: Stop[],
  settings: SolveSettings,
): string {
  const header = "order,name,address,lat,lng,arrive,leg_km,service_minutes";
  const lines = rowsOf(plan, stops, settings).map((r) =>
    [
      r.index,
      quote(r.isFinalReturn ? `Back to ${r.stop.name}` : r.stop.name),
      quote(r.stop.address ?? ""),
      r.stop.lat.toFixed(6),
      r.stop.lng.toFixed(6),
      formatClock(r.arriveMinutes),
      r.legKm.toFixed(2),
      r.index === 0 || r.isFinalReturn ? 0 : r.stop.serviceMinutes,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/** Plain text, sized for a phone. This is what gets sent to the driver. */
export function toDriverText(
  plan: RoutePlan,
  stops: Stop[],
  settings: SolveSettings,
): string {
  const rows = rowsOf(plan, stops, settings);
  const lines = rows.map((r) => {
    const when = formatClock(r.arriveMinutes);
    if (r.index === 0) return `${when}  Leave ${r.stop.name}`;
    if (r.isFinalReturn) return `${when}  Back at ${r.stop.name}`;
    const where = r.stop.address ? `\n        ${r.stop.address}` : "";
    return `${when}  ${r.index}. ${r.stop.name}${where}`;
  });

  return [
    `Run — ${formatKm(plan.distanceKm)}, ${Math.round(plan.totalMinutes)} min`,
    "",
    ...lines,
  ].join("\n");
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
