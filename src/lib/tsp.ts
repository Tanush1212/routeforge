import { buildDistanceMatrix } from "./geo";
import type { Leg, RoutePlan, SolveResult, SolveSettings, Stop } from "./types";

/**
 * Single-vehicle route optimization.
 *
 * One depot, every stop visited exactly once, optionally returning to the depot.
 * The depot is always index 0 and is pinned to the front of the tour.
 *
 * Strategy: multi-start (deterministic) randomized nearest-neighbour construction,
 * then 2-opt and Or-opt local search on each start until neither move improves.
 * The best tour across all starts wins.
 */

/** Deterministic PRNG so the same upload always produces the same route. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Problem {
  readonly n: number;
  private readonly d: Float64Array;

  constructor(
    stops: Stop[],
    roadFactor: number,
    readonly closed: boolean,
  ) {
    this.n = stops.length;
    this.d = buildDistanceMatrix(stops, roadFactor);
  }

  dist(a: number, b: number): number {
    return this.d[a * this.n + b];
  }

  tourCost(tour: number[]): number {
    let total = 0;
    for (let k = 0; k < tour.length - 1; k++) {
      total += this.dist(tour[k], tour[k + 1]);
    }
    if (this.closed && tour.length > 1) {
      total += this.dist(tour[tour.length - 1], tour[0]);
    }
    return total;
  }

  /** Node following position k in the tour, or -1 when k is the open end. */
  private succ(tour: number[], k: number): number {
    if (k < tour.length - 1) return tour[k + 1];
    return this.closed ? tour[0] : -1;
  }

  /**
   * Reverse tour[i..j] when that shortens the tour. Returns the improvement
   * (positive) or 0. Depot at position 0 is never moved.
   */
  private twoOptPass(tour: number[]): number {
    const n = tour.length;
    let gained = 0;

    for (let i = 1; i < n - 1; i++) {
      const prev = tour[i - 1];
      const a = tour[i];
      const removedHead = this.dist(prev, a);

      for (let j = i + 1; j < n; j++) {
        const b = tour[j];
        const next = this.succ(tour, j);

        // Reversing a suffix of an open tour only changes the head edge.
        const removed =
          next === -1
            ? removedHead
            : removedHead + this.dist(b, next);
        const added =
          next === -1
            ? this.dist(prev, b)
            : this.dist(prev, b) + this.dist(a, next);

        const delta = removed - added;
        if (delta > 1e-9) {
          reverse(tour, i, j);
          gained += delta;
          return gained; // restart scanning from a clean tour
        }
      }
    }

    return gained;
  }

  /**
   * Lift a run of 1–3 consecutive stops and reinsert it elsewhere, forwards or
   * reversed. Fixes the "one stop stranded on the wrong side of town" case that
   * 2-opt alone cannot undo.
   */
  private orOptPass(tour: number[]): number {
    const n = tour.length;

    for (let len = 1; len <= 3 && len < n - 1; len++) {
      for (let i = 1; i + len <= n; i++) {
        const segment = tour.slice(i, i + len);
        const before = tour[i - 1];
        const after = this.succ(tour, i + len - 1);

        const removed =
          this.dist(before, segment[0]) +
          (after === -1 ? 0 : this.dist(segment[len - 1], after)) -
          (after === -1 ? 0 : this.dist(before, after));

        if (removed <= 1e-9) continue;

        const rest = tour.slice(0, i).concat(tour.slice(i + len));

        for (let k = 1; k <= rest.length; k++) {
          if (k === i) continue; // putting it straight back

          const left = rest[k - 1];
          const right = k < rest.length ? rest[k] : this.closed ? rest[0] : -1;
          if (left === undefined) continue;

          const bridge = right === -1 ? 0 : this.dist(left, right);

          for (const flipped of [false, true]) {
            if (flipped && len === 1) continue;
            const head = flipped ? segment[len - 1] : segment[0];
            const tail = flipped ? segment[0] : segment[len - 1];

            const added =
              this.dist(left, head) +
              (right === -1 ? 0 : this.dist(tail, right)) -
              bridge;

            const delta = removed - added;
            if (delta > 1e-9) {
              const moved = flipped ? [...segment].reverse() : segment;
              tour.length = 0;
              tour.push(...rest.slice(0, k), ...moved, ...rest.slice(k));
              return delta;
            }
          }
        }
      }
    }

    return 0;
  }

  /** Run both neighbourhoods to a local optimum. Returns the pass count. */
  improve(tour: number[], maxPasses: number): number {
    let passes = 0;
    while (passes < maxPasses) {
      passes++;
      if (this.twoOptPass(tour) > 0) continue;
      if (this.orOptPass(tour) > 0) continue;
      break;
    }
    return passes;
  }

  /**
   * Nearest-neighbour construction from the depot. `jitter` of 0 is pure greedy;
   * higher values pick randomly among that many nearest candidates.
   */
  construct(jitter: number, rand: () => number): number[] {
    const unvisited = new Set<number>();
    for (let i = 1; i < this.n; i++) unvisited.add(i);

    const tour = [0];
    let current = 0;

    while (unvisited.size > 0) {
      const candidates = [...unvisited]
        .map((i) => ({ i, d: this.dist(current, i) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, Math.max(1, Math.min(jitter || 1, unvisited.size)));

      const chosen = candidates[Math.floor(rand() * candidates.length)].i;
      tour.push(chosen);
      unvisited.delete(chosen);
      current = chosen;
    }

    return tour;
  }
}

function reverse(arr: number[], i: number, j: number): void {
  while (i < j) {
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    i++;
    j--;
  }
}

function toPlan(
  tour: number[],
  stops: Stop[],
  problem: Problem,
  settings: SolveSettings,
): RoutePlan {
  const sequence = settings.returnToDepot ? [...tour, 0] : tour;
  const legs: Leg[] = [];
  let distanceKm = 0;

  for (let k = 0; k < sequence.length - 1; k++) {
    const from = sequence[k];
    const to = sequence[k + 1];
    const km = problem.dist(from, to);
    const driveMinutes = (km / settings.speedKmh) * 60;
    distanceKm += km;
    legs.push({
      fromId: stops[from].id,
      toId: stops[to].id,
      distanceKm: km,
      driveMinutes,
    });
  }

  const driveMinutes = (distanceKm / settings.speedKmh) * 60;
  // The depot is not a delivery, so its service time never counts.
  const serviceMinutes = tour
    .slice(1)
    .reduce((sum, i) => sum + stops[i].serviceMinutes, 0);

  return {
    order: sequence.map((i) => stops[i].id),
    legs,
    distanceKm,
    driveMinutes,
    serviceMinutes,
    totalMinutes: driveMinutes + serviceMinutes,
  };
}

/**
 * `stops[0]` must be the depot. Returns both the route implied by the upload's
 * row order and the optimized route, so the UI can show the comparison.
 */
export function solve(stops: Stop[], settings: SolveSettings): SolveResult {
  const startedAt = performance.now();
  const problem = new Problem(stops, settings.roadFactor, settings.returnToDepot);

  const baseline = stops.map((_, i) => i); // already in upload order
  const before = toPlan(baseline, stops, problem, settings);

  if (stops.length <= 3) {
    // Nothing to reorder: any permutation of ≤2 stops costs the same.
    return {
      before,
      after: before,
      savedKm: 0,
      savedMinutes: 0,
      savedFraction: 0,
      iterations: 0,
      elapsedMs: performance.now() - startedAt,
    };
  }

  const rand = mulberry32(0x5f3759df);
  const restarts = Math.min(48, Math.max(12, Math.round(600 / stops.length)));
  const maxPasses = 4000;

  let best = problem.construct(0, rand);
  let iterations = problem.improve(best, maxPasses);
  let bestCost = problem.tourCost(best);

  for (let r = 1; r < restarts; r++) {
    const candidate = problem.construct(2 + (r % 3), rand);
    iterations += problem.improve(candidate, maxPasses);
    const cost = problem.tourCost(candidate);
    if (cost < bestCost - 1e-9) {
      best = candidate;
      bestCost = cost;
    }
  }

  // Never hand back something worse than what the user already had.
  const afterPlan = toPlan(best, stops, problem, settings);
  const after =
    afterPlan.distanceKm <= before.distanceKm + 1e-9 ? afterPlan : before;

  const savedKm = before.distanceKm - after.distanceKm;

  return {
    before,
    after,
    savedKm,
    savedMinutes: before.totalMinutes - after.totalMinutes,
    savedFraction: before.distanceKm > 0 ? savedKm / before.distanceKm : 0,
    iterations,
    elapsedMs: performance.now() - startedAt,
  };
}
