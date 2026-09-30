# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind v4. Google Maps JavaScript API for display. User decision, confirmed.

## Users

Small home-based brands with one or two helpers. The owner plans the delivery run at a laptop — usually the night before or the morning of — then hands the resulting stop list to whoever is actually driving. Planning and driving are done by different people, so the output has to survive being handed off: readable on a phone, printable, shareable.

## Product Purpose

Turn an unordered list of delivery addresses into the shortest possible driving sequence from the brand's storage house and back. Success is the owner seeing, on first use, that the optimized order beats the order they were already going to drive in — stated in minutes and kilometres saved.

## Positioning

Route optimizers are built for fleets: they assume a depot system, a dispatcher, and a monthly seat. RouteForge assumes one storage house, one car, a CSV exported from whatever the brand already uses, and no logistics vocabulary. It answers one question — what order do I drive these in — and shows its work against the order the user arrived with.

## Operating Context

- Input arrives as a spreadsheet export: order name, address or coordinates, sometimes a drop-off duration.
- The storage house is a room in someone's home, not a warehouse. There is exactly one.
- The run is planned on a laptop and executed from a phone in a car.
- Runs are weekly or twice-weekly batches, not continuous dispatch.

## Capabilities and Constraints

- **Optimization:** single-vehicle TSP — one depot, every stop visited once, optional return to depot. Confirmed scope; multi-vehicle and capacity constraints are explicitly out.
- **Distances:** straight-line (haversine) with a road-circuity correction. The paid Routes/Distance Matrix APIs are deliberately not called — the user chose free-tier-only operation. The correction factor is user-adjustable and labelled as an estimate everywhere it appears.
- **Maps:** Google Maps JavaScript API for display only. The app must remain fully usable with no API key configured.
- **Input:** CSV upload. Coordinates preferred; addresses accepted but require an explicitly user-initiated geocode, because geocoding is a billed call.
- All computation is client-side. No accounts, no server storage, no upload of customer addresses to any backend.

## Brand Commitments

Name: RouteForge. Voice: plain, confident, operator-grade. No logistics-enterprise jargon — the user says "stops" and "run", not "nodes" and "itinerary optimization".

## Evidence on Hand

None. No customers, no benchmarks, no testimonials, no pricing. Nothing on the surface may imply any of these exist. The sample dataset shipped in `public/` is explicitly labelled as sample data.

## Product Principles

1. **Show the comparison, not just the answer.** The optimized route means nothing without the route it replaced beside it.
2. **The output is a handoff.** Everything on screen has to survive being sent to a driver who was not there when it was planned.
3. **Be honest about the estimate.** Straight-line distances are an approximation; say so where the number is, not in a footnote.
4. **No key, no account, no blocker.** Every part of the product works before the user has configured anything.
5. **Their data stays theirs.** Customer addresses never leave the browser.

## Accessibility & Inclusion

The stop list is the primary output and must be fully usable without the map: keyboard reachable, screen-reader ordered, and legible in print. Route identity is never carried by color alone.
