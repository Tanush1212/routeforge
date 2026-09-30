# Design

<!-- impeccable:design-schema 1 -->

## Surface & Mode

Single-surface web application. **Operate** — the visitor is planning a delivery run and handing it to a driver. Scanability and trust in the numbers outrank expression. Brand lives in the details: the map treatment, the route comparison, the numerals.

## Use Scene

A laptop on a kitchen table, daytime, indoor light. Light mode is the default because the planning happens in daylight and the stop list gets printed. Dark mode is supported for evening planning, and is a full re-theme, not an inversion.

## The World: Run Sheet

The reference is a physical dispatch run sheet — warm paper stock, ruled rows, a stamped route number, measurements set in a monospace hand. Not enterprise-logistics chrome, not a SaaS dashboard. The interface reads as a document you could print and hand across a car window, because that is literally its job.

Three commitments carry it:

1. **Paper canvas, ink text.** Warm off-white ground (`--rf-canvas`), near-black warm ink. Panels are the same paper one step brighter, separated by hairline rules rather than by shadow stacks.
2. **Two routes, two voices.** The route the user arrived with is drawn in a muted warm gray, dashed, recessive. The optimized route is drawn in forge orange, solid, on top. Every savings number in the UI is the difference between those two drawings. The comparison is the product.
3. **Numerals are set, not defaulted.** All distances, durations, and stop numbers use tabular-figure monospace. Measurement is the content here; it gets its own hand.

## Color

Restrained. One accent, one comparison neutral, one success tint.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--rf-canvas` | `#F7F5F1` | `#141310` | Page ground |
| `--rf-panel` | `#FFFDFA` | `#1D1B17` | Panels, cards, rows |
| `--rf-panel-2` | `#F1EEE8` | `#252219` | Sidebar, toolbar, table headers |
| `--rf-ink` | `#191712` | `#F6F3EC` | Primary text |
| `--rf-ink-2` | `#5C564A` | `#A8A294` | Secondary text (warm, never gray-500) |
| `--rf-ink-3` | `#8A8375` | `#6F6A5C` | Tertiary, placeholders |
| `--rf-rule` | `#E2DCD1` | `#312D25` | Hairlines, borders |
| `--rf-accent` | `#C6460A` | `#F2712F` | Optimized route, primary action, current selection |
| `--rf-accent-soft` | `#FBEDE4` | `#3A1F10` | Accent fills, badges |
| `--rf-before` | `#9A9386` | `#7A7466` | The original route, dashed |
| `--rf-good` | `#1E6B45` | `#5FBE8C` | Savings, success |
| `--rf-bad` | `#A32A20` | `#F08379` | Errors, invalid rows |

Accent is reserved for the optimized route, the primary action, and the current selection. It never decorates.

## Typography

One family for the interface, one for measurement.

- **Interface:** Inter Tight. Headings, labels, body, controls. Fixed rem scale at a 1.2 ratio — no fluid clamps in product UI.
- **Measurement:** JetBrains Mono, `font-variant-numeric: tabular-nums`. Distances, durations, stop indices, coordinates. Monospace here is for data, not costume.
- Display maximum is 2.25rem. This is a tool; nothing needs to shout.
- Tracking: `-0.02em` on headings, `-0.01em` on the mono at small sizes.

## Layout

Two-pane on desktop: a fixed 420px working rail on the left (upload → settings → results, a single vertical flow), and the map filling the remainder. The rail scrolls; the map does not.

Below 1024px the panes stack: map first at 44vh so the user still gets spatial context, then the rail beneath it as a full-width column. The stop list is always reachable without the map.

## Components

- **Rows over cards.** The stop list is a ruled table, not a stack of cards. Hairline separators, no per-row shadow, no nested containers.
- **Hairline + lift.** Depth is a 1px rule plus a real offset shadow (`0 1px 2px`, `0 8px 24px` at the top level) — never a zero-offset halo.
- **Numbered stop markers** are drawn SVG pins with the sequence number set in the mono face, filled in accent. The depot is a distinct square-shouldered mark, not a colored circle.
- Every control ships default, hover, focus-visible, active, disabled, loading, error.
- Empty state teaches the CSV format and offers the sample run; it never says "no data".

## Motion

One authored moment: when a solve completes, the optimized polyline draws itself along its path (stroke-dashoffset on the SVG map; sequential vertex reveal on the Google map) over ~700ms, and the savings figure counts from the original value down to the optimized one. That is the product proving itself, so it gets the one piece of choreography.

Everything else is 150–200ms state feedback. No page-load sequence. All of it respects `prefers-reduced-motion`.

## Browser Surfaces

Selection, caret, focus ring, scrollbars, and underline offset are themed from the palette. Focus ring is a 2px accent ring at a 2px offset, on every interactive element.

## Bans for this project

- No gradient text, no glass, no colored left-borders, no hero-metric template, no kickers.
- No emoji or unicode glyphs as icons — the icon set is authored SVG at a uniform 1.5px stroke.
- The savings number is never presented without the two figures it was derived from.
