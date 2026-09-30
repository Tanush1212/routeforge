export type StopKind = "depot" | "stop";

export interface Stop {
  /** Stable id, assigned at parse time. */
  id: string;
  name: string;
  kind: StopKind;
  lat: number;
  lng: number;
  /** Raw address text from the CSV, kept for display and for optional geocoding. */
  address?: string;
  /** Minutes spent at this stop (unloading, handover). */
  serviceMinutes: number;
  /** 0-based position in the file the user uploaded. Defines the "before" route. */
  sourceIndex: number;
}

export interface ParseIssue {
  row: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
}

export interface ParseResult {
  stops: Stop[];
  issues: ParseIssue[];
  /** Rows that carried an address but no usable coordinates. */
  needsGeocoding: number;
}

export interface SolveSettings {
  /** Average driving speed, km/h. */
  speedKmh: number;
  /**
   * Multiplier applied to straight-line distance to approximate road distance.
   * 1.0 = as the crow flies. Typical urban road networks land near 1.3.
   */
  roadFactor: number;
  /** Whether the vehicle returns to the storage house at the end. */
  returnToDepot: boolean;
  /** Clock time the run starts, as minutes past midnight. */
  startMinutes: number;
}

export interface Leg {
  fromId: string;
  toId: string;
  distanceKm: number;
  driveMinutes: number;
}

export interface RoutePlan {
  /** Stop ids in visit order, starting at the depot. Includes the depot again when returning. */
  order: string[];
  legs: Leg[];
  distanceKm: number;
  driveMinutes: number;
  serviceMinutes: number;
  totalMinutes: number;
}

export interface SolveResult {
  /** The route implied by the row order of the uploaded file. */
  before: RoutePlan;
  /** The optimized route. */
  after: RoutePlan;
  savedKm: number;
  savedMinutes: number;
  /** 0–1. Share of the original distance removed. */
  savedFraction: number;
  /** How many improvement passes the solver ran. */
  iterations: number;
  elapsedMs: number;
}

export const DEFAULT_SETTINGS: SolveSettings = {
  speedKmh: 30,
  roadFactor: 1.3,
  returnToDepot: true,
  startMinutes: 9 * 60,
};
