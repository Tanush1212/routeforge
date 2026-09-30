# RouteForge

Upload your stops, get the shortest driving order from your storage house, and
see exactly how much it saves against the order you started with.

Built for home-based brands: one storage house, one car, a CSV exported from
whatever you already use.

```bash
npm install
npm run dev
```

Then open http://localhost:3000 and hit **Try a sample run**.

---

## What it does

1. You upload a CSV of your storage house plus every delivery stop.
2. It solves a single-vehicle TSP — every stop visited once, optionally
   returning to the storage house.
3. It shows the optimized run **next to the order you uploaded**, so the saving
   is a comparison rather than a claim.
4. You copy the stop list to the driver, download it as CSV, or print it.

## The CSV

| Column | Required | Notes |
|---|---|---|
| `name` | yes | Whatever you call the stop. |
| `lat`, `lng` | yes | Right-click a spot in Google Maps — the first menu item is the pair. |
| `type` | no | Put `depot` on the storage house row. Without it, the first row is used. |
| `address` | no | Display only. |
| `service_minutes` | no | How long that drop-off takes. Defaults to 0. |

Header names are matched loosely — `latitude`/`longitude`, `customer`, `stop`,
`duration` and similar all work. `public/template.csv` is a starter file.

Rows that cannot be used are reported individually with their line number; the
rest of the file still solves.

## Google Maps

The app runs **without** a Maps key — it falls back to an accurate Web Mercator
plot of your locations. Route shapes and relative positions are correct; there
is just no basemap under them.

For the real basemap:

```bash
cp .env.local.example .env.local
# paste your key into NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

Enable **only** the Maps JavaScript API. RouteForge never calls the Routes,
Directions, or Distance Matrix APIs, so leaving those disabled is your billing
guardrail. Restrict the key to your HTTP referrers.

### Why distances are straight-line

Real road distances mean per-request billing on the Distance Matrix or Routes
API — for *n* stops that is *n²* billed elements every time you change a
setting. RouteForge instead uses great-circle distance multiplied by a **road
factor** you control (default `1.3`). That is accurate enough to rank one
ordering against another, which is the entire job, and it costs nothing.

It is not turn-by-turn navigation, and the app says so on screen next to the
numbers rather than in a footnote.

If you later want true road distances, `src/lib/geo.ts:buildDistanceMatrix` is
the single place to swap — return a matrix from the Routes API and everything
downstream keeps working.

## Deploying

The app is fully client-side, so any static or Node host works. On Vercel:

1. Push this repo to GitHub (done).
2. At [vercel.com/new](https://vercel.com/new), import the repo. Vercel detects
   Next.js and needs no configuration — defaults are correct.
3. **If you want the real basemap**, add one environment variable in the Vercel
   project settings before deploying:
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = your key.
   Without it the app still works, using the built-in plot.

> `NEXT_PUBLIC_*` variables are compiled into the browser bundle — that is how
> the Maps JS API is meant to work, but it does mean the key is readable by
> anyone who opens the site. Restrict it by HTTP referrer to your Vercel domain
> in the Google Cloud console, and keep Routes/Directions/Distance Matrix
> disabled on that key so a scraped copy cannot run up a bill.

## The algorithm

`src/lib/tsp.ts`. Depot pinned at index 0, then:

- **Construction** — nearest-neighbour from the depot, plus 11–47 randomized
  restarts that pick among the 2–4 nearest candidates. Seeded, so the same
  upload always produces the same route.
- **Improvement** — 2-opt (uncross two legs) and Or-opt (lift a run of 1–3
  stops and reinsert it, forwards or reversed) run alternately to a local
  optimum on every restart.
- **Selection** — best tour across all restarts, and never worse than the order
  you uploaded.

Open tours (`returnToDepot: false`) are handled throughout — the move deltas
account for the missing closing edge rather than assuming a cycle.

On the 15-stop sample this cuts 282 km to 107 km in a few milliseconds.

## Project layout

```
src/lib/tsp.ts        solver: construction + 2-opt + Or-opt
src/lib/geo.ts        haversine, distance matrix, Mercator, formatting
src/lib/csv.ts        tolerant CSV parser with per-row diagnostics
src/lib/export.ts     driver text, CSV export
src/components/       map canvases, panels, icon set, UI primitives
PRODUCT.md            who this is for and what must stay true
DESIGN.md             the visual system and its rules
```

## Privacy

Everything runs in the browser. The CSV is read with the File API and never
uploaded; there is no backend, no account, and no storage. Customer addresses
stay on the machine that opened the page.

## Not in scope

Single vehicle only. No capacity limits, no time windows, no multi-vehicle
splitting, no live traffic. Those are a different product, and pretending
otherwise would make the numbers above dishonest.
