import type { ParseIssue, ParseResult, Stop } from "./types";

/** RFC 4180-ish splitter: handles quoted fields, escaped quotes, and CRLF. */
function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const ALIASES: Record<string, string[]> = {
  name: ["name", "stop", "customer", "order", "label", "title", "client", "id"],
  lat: ["lat", "latitude", "y"],
  lng: ["lng", "lon", "long", "longitude", "x"],
  address: ["address", "location", "street", "full address", "addr", "place"],
  kind: ["type", "kind", "role", "category"],
  service: [
    "service",
    "service min",
    "service minutes",
    "duration",
    "minutes",
    "stop time",
    "dwell",
  ],
};

const DEPOT_WORDS = [
  "depot",
  "warehouse",
  "storage",
  "storage house",
  "start",
  "origin",
  "hub",
  "home",
  "base",
];

const normalize = (h: string) =>
  h.trim().toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ");

function mapHeaders(header: string[]): Record<string, number> {
  const found: Record<string, number> = {};
  const normalized = header.map(normalize);

  for (const [key, aliases] of Object.entries(ALIASES)) {
    const index = normalized.findIndex((h) => aliases.includes(h));
    if (index !== -1) found[key] = index;
  }

  return found;
}

function toNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(/[^\d.\-+eE]/g, ""));
  return Number.isFinite(value) ? value : null;
}

export const CSV_TEMPLATE_HEADER = "name,type,lat,lng,address,service_minutes";

export function parseCsv(text: string): ParseResult {
  const issues: ParseIssue[] = [];
  const rows = splitRows(text);

  if (rows.length === 0) {
    return {
      stops: [],
      issues: [{ row: 0, message: "That file is empty.", severity: "error" }],
      needsGeocoding: 0,
    };
  }

  const columns = mapHeaders(rows[0]);
  const hasHeader = Object.keys(columns).length > 0;

  if (!hasHeader) {
    return {
      stops: [],
      issues: [
        {
          row: 1,
          message:
            "No recognizable column names in the first row. Expected at least a name column plus either lat and lng, or address.",
          severity: "error",
        },
      ],
      needsGeocoding: 0,
    };
  }

  if (columns.lat === undefined || columns.lng === undefined) {
    if (columns.address === undefined) {
      return {
        stops: [],
        issues: [
          {
            row: 1,
            message:
              "Need either lat and lng columns, or an address column. Found neither.",
            severity: "error",
          },
        ],
        needsGeocoding: 0,
      };
    }
  }

  const stops: Stop[] = [];
  let needsGeocoding = 0;
  let depotIndex = -1;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const rowNumber = r + 1;

    const name =
      columns.name !== undefined ? cells[columns.name]?.trim() : undefined;
    const address =
      columns.address !== undefined
        ? cells[columns.address]?.trim()
        : undefined;
    const lat = columns.lat !== undefined ? toNumber(cells[columns.lat]) : null;
    const lng = columns.lng !== undefined ? toNumber(cells[columns.lng]) : null;

    const label = name || address || `Stop ${r}`;

    if (lat === null || lng === null) {
      if (address) {
        needsGeocoding++;
        issues.push({
          row: rowNumber,
          field: "lat/lng",
          message: `"${label}" has an address but no coordinates.`,
          severity: "warning",
        });
      } else {
        issues.push({
          row: rowNumber,
          field: "lat/lng",
          message: `"${label}" has no coordinates and no address. Row skipped.`,
          severity: "error",
        });
      }
      continue;
    }

    if (lat < -90 || lat > 90) {
      issues.push({
        row: rowNumber,
        field: "lat",
        message: `Latitude ${lat} is outside -90 to 90. Row skipped.`,
        severity: "error",
      });
      continue;
    }

    if (lng < -180 || lng > 180) {
      issues.push({
        row: rowNumber,
        field: "lng",
        message: `Longitude ${lng} is outside -180 to 180. Row skipped.`,
        severity: "error",
      });
      continue;
    }

    const kindRaw =
      columns.kind !== undefined
        ? normalize(cells[columns.kind] ?? "")
        : "";
    const isDepot = DEPOT_WORDS.includes(kindRaw);

    const service =
      columns.service !== undefined ? toNumber(cells[columns.service]) : null;

    if (service !== null && service < 0) {
      issues.push({
        row: rowNumber,
        field: "service_minutes",
        message: `Negative stop time on "${label}". Treated as 0.`,
        severity: "warning",
      });
    }

    const stop: Stop = {
      id: `s${r}`,
      name: label,
      kind: isDepot ? "depot" : "stop",
      lat,
      lng,
      address: address || undefined,
      serviceMinutes: service !== null && service > 0 ? service : 0,
      sourceIndex: stops.length,
    };

    if (isDepot) {
      if (depotIndex === -1) {
        depotIndex = stops.length;
      } else {
        issues.push({
          row: rowNumber,
          field: "type",
          message: `More than one storage house found. "${label}" was treated as a regular stop.`,
          severity: "warning",
        });
        stop.kind = "stop";
      }
    }

    stops.push(stop);
  }

  if (stops.length === 0) {
    issues.push({
      row: 0,
      message: "No usable rows. Every row was missing coordinates.",
      severity: "error",
    });
    return { stops, issues, needsGeocoding };
  }

  if (depotIndex === -1) {
    stops[0].kind = "depot";
    depotIndex = 0;
    issues.push({
      row: 2,
      field: "type",
      message: `No row was marked as the storage house, so "${stops[0].name}" is being used as the start and end. Add a type column with "depot" to change that.`,
      severity: "warning",
    });
  }

  // The solver requires the depot at index 0.
  if (depotIndex !== 0) {
    const [depot] = stops.splice(depotIndex, 1);
    stops.unshift(depot);
  }

  stops.forEach((s, i) => {
    s.sourceIndex = i;
  });

  if (stops.length < 3) {
    issues.push({
      row: 0,
      message:
        "Only one stop to visit. There is nothing to reorder — add more stops to see a saving.",
      severity: "warning",
    });
  }

  return { stops, issues, needsGeocoding };
}
